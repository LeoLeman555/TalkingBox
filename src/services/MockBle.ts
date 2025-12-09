export class MockBle {
  async scanAndConnect() {
    await new Promise(r => setTimeout(r, 500));
    return true;
  }

  async sendChunk(_data: Uint8Array) {
    await new Promise(r => setTimeout(r, 50));
  }

  async endTransfer() {
    await new Promise(r => setTimeout(r, 100));
  }

  async play() {
    await new Promise(r => setTimeout(r, 300));
  }
}
