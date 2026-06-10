declare module 'mappls-web-maps' {
    export class mappls {
      initialize(token: string, loadObject: object, callback: () => void): void;
      Map(config: { id: string; properties: object }): any;
    }
    export class mappls_plugin {
      // Define custom plugin types here if needed
    }
  }
  