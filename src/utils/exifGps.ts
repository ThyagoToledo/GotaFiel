/**
 * Utilitário leve em TypeScript puro para extrair coordenadas GPS de metadados EXIF
 * de fotografias capturadas por smartphones (Android e iOS) em campo.
 */

export interface ExifGpsCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Converte graus, minutos e segundos decimais do EXIF para graus decimais (WGS84)
 */
function convertDmsToDecimal(
  degrees: number,
  minutes: number,
  seconds: number,
  direction: string
): number {
  let decimal = degrees + minutes / 60 + seconds / 3600;
  if (direction === 'S' || direction === 'W') {
    decimal = -decimal;
  }
  return decimal;
}

/**
 * Lê coordenadas GPS de um arquivo de imagem JPEG
 */
export async function extractGpsFromImageFile(
  file: File | Blob
): Promise<ExifGpsCoordinates | null> {
  try {
    const buffer = await file.arrayBuffer();
    if (buffer.byteLength < 4) {
      return null;
    }
    const dataView = new DataView(buffer);

    // Verifica assinatura JPEG (SOI: 0xFFD8)
    if (dataView.getUint16(0) !== 0xffd8) {
      return null;
    }

    let offset = 2;
    const length = dataView.byteLength;

    while (offset < length - 4) {
      const marker = dataView.getUint16(offset);
      offset += 2;

      // Marcador APP1 (EXIF: 0xFFE1)
      if (marker === 0xffe1) {
        const app1Length = dataView.getUint16(offset);
        offset += 2;

        // Verifica header "Exif\0\0" (0x45786966 0x0000)
        if (
          dataView.getUint32(offset) === 0x45786966 &&
          dataView.getUint16(offset + 4) === 0x0000
        ) {
          const tiffOffset = offset + 6;
          return parseTiffForGps(dataView, tiffOffset);
        }
        offset += app1Length - 2;
      } else if ((marker & 0xff00) === 0xff00 && marker !== 0xffd8 && marker !== 0xffd9) {
        // Pula outros segmentos
        const segmentLength = dataView.getUint16(offset);
        offset += segmentLength;
      } else {
        break;
      }
    }
  } catch (err) {
    console.debug('EXIF GPS não localizado ou formato não suportado:', err);
  }
  return null;
}

function parseTiffForGps(dataView: DataView, tiffOffset: number): ExifGpsCoordinates | null {
  try {
    const byteOrder = dataView.getUint16(tiffOffset);
    const littleEndian = byteOrder === 0x4949; // "II" (Intel) vs "MM" (Motorola)

    // Verifica tag 0x002A do TIFF
    if (dataView.getUint16(tiffOffset + 2, littleEndian) !== 0x002a) {
      return null;
    }

    const firstIfdOffset = dataView.getUint32(tiffOffset + 4, littleEndian);
    if (firstIfdOffset < 8) return null;

    let gpsIfdOffset: number | null = null;
    let ifdOffset = tiffOffset + firstIfdOffset;
    const numEntries = dataView.getUint16(ifdOffset, littleEndian);

    // Percorre IFD0 procurando a tag GPSInfo (0x8825)
    for (let i = 0; i < numEntries; i++) {
      const entryOffset = ifdOffset + 2 + i * 12;
      const tag = dataView.getUint16(entryOffset, littleEndian);
      if (tag === 0x8825) {
        gpsIfdOffset = dataView.getUint32(entryOffset + 8, littleEndian);
        break;
      }
    }

    if (gpsIfdOffset === null) return null;

    const gpsOffset = tiffOffset + gpsIfdOffset;
    const numGpsEntries = dataView.getUint16(gpsOffset, littleEndian);

    let latRef = 'N';
    let lonRef = 'E';
    let latDms: [number, number, number] | null = null;
    let lonDms: [number, number, number] | null = null;

    for (let i = 0; i < numGpsEntries; i++) {
      const entryOffset = gpsOffset + 2 + i * 12;
      const tag = dataView.getUint16(entryOffset, littleEndian);

      if (tag === 0x0001) {
        // GPSLatitudeRef
        latRef = String.fromCharCode(dataView.getUint8(entryOffset + 8));
      } else if (tag === 0x0002) {
        // GPSLatitude
        const valueOffset = tiffOffset + dataView.getUint32(entryOffset + 8, littleEndian);
        latDms = readRational3(dataView, valueOffset, littleEndian);
      } else if (tag === 0x0003) {
        // GPSLongitudeRef
        lonRef = String.fromCharCode(dataView.getUint8(entryOffset + 8));
      } else if (tag === 0x0004) {
        // GPSLongitude
        const valueOffset = tiffOffset + dataView.getUint32(entryOffset + 8, littleEndian);
        lonDms = readRational3(dataView, valueOffset, littleEndian);
      }
    }

    if (latDms && lonDms) {
      const latitude = convertDmsToDecimal(latDms[0], latDms[1], latDms[2], latRef);
      const longitude = convertDmsToDecimal(lonDms[0], lonDms[1], lonDms[2], lonRef);
      if (!isNaN(latitude) && !isNaN(longitude)) {
        return { latitude, longitude };
      }
    }
  } catch (err) {
    console.debug('Erro ao decodificar GPS IFD:', err);
  }
  return null;
}

function readRational3(
  dataView: DataView,
  offset: number,
  littleEndian: boolean
): [number, number, number] {
  const dNum = dataView.getUint32(offset, littleEndian);
  const dDen = dataView.getUint32(offset + 4, littleEndian);
  const mNum = dataView.getUint32(offset + 8, littleEndian);
  const mDen = dataView.getUint32(offset + 12, littleEndian);
  const sNum = dataView.getUint32(offset + 16, littleEndian);
  const sDen = dataView.getUint32(offset + 20, littleEndian);

  const deg = dDen ? dNum / dDen : 0;
  const min = mDen ? mNum / mDen : 0;
  const sec = sDen ? sNum / sDen : 0;

  return [deg, min, sec];
}
