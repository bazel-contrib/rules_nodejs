export function readMetadata(buffer: Buffer, offset: number) {
  let b;
  let result = 0;
  let intOffset = 0;

  for (let i = 0; i < 5; i++) {
    b = buffer[offset + intOffset++];
    result |= (b & 0x7f) << (7 * i);
    if (!(b & 0x80)) {
      break;
    }
  }

  return { messageSize: result, headerSize: intOffset };
}

export function writeMetadata(messageSize: number) {
  const buffer = new Uint8Array(10);
  for (let index = 0; messageSize > 127; index++) {
    buffer[index] = (messageSize & 0x7f) | 0x80;
    messageSize = messageSize >>> 7;
  }
  buffer[buffer.length] = messageSize;
  return buffer;
}