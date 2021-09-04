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
  const buffer = Buffer.alloc(10);
  let index = 0;
  while (messageSize > 127) {
    buffer[index] = (messageSize & 0x7f) | 0x80;
    messageSize = messageSize >>> 7;
    index++;
  }
  buffer[index] = messageSize;
  return buffer.slice(0, index + 1);
}