/** `.md` files are bundled as plain strings (the `loader` option in angular.json). */
declare module '*.md' {
  const text: string;
  export default text;
}
