export namespace Arrays2 {
  export function remove<T>(array: T[], value: T) {
    const index = array.indexOf(value);
    if (index !== -1) {
      array.splice(index, 1);
    }
  }
}
