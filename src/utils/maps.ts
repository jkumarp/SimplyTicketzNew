import { mappls } from 'mappls-web-maps';

// Instantiate the Mappls class
const mapplsClassObject = new mappls();

interface MapProperties {
  center: [number, number];
  zoom: number;
}

interface LoadObject {
  map: boolean;
  version: string;
  libraries?: string[];
  plugins?: string[];
}

export function initMapplsMap(containerId: string): void {
  const accessToken: string = "YOUR_MAPPLS_ACCESS_TOKEN"; //
  
  const loadOptions: LoadObject = {
    map: true,
    version: '3.0',
    libraries: [''],
    plugins: ['']
  };

  // Initialize the SDK with your access token
  mapplsClassObject.initialize(accessToken, loadOptions, () => {
    
    const mapProps: MapProperties = {
      center: [28.633, 77.2194], // [Latitude, Longitude] for Delhi
      zoom: 4
    };

    // Render the map inside the targeted HTML Container Element
    const mapInstance = mapplsClassObject.Map({
      id: containerId,
      properties: mapProps
    });

    // Handle map load event listeners
    mapInstance.on("load", () => {
      console.log("Mappls Map fully loaded in TypeScript application!");
    });
  });
}
