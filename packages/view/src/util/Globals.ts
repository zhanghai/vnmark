export namespace Globals {
  export async function delay(delay?: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => resolve(), delay);
    });
  }
}
