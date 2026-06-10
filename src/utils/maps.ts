import { mappls } from 'mappls-web-maps';

// Instantiate the Mappls class
const mapplsClassObject = new mappls();
let isInitialized = false;

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

export function initMapplsMap(containerId: string, center: [number, number] = [19.6012, 73.7091], zoom: number = 12): void {
  const accessToken: string = "ycocwnbfdcwbwfyfhnblgiafykhkvlilnlpf"; 
  
  const loadOptions: LoadObject = {
    map: true,
    version: '3.0',
    libraries: [''],
    plugins: ['']
  };

  const startMap = () => {
    const mapProps: MapProperties = {
      center: center,
      zoom: zoom
    };

    // Render the map inside the targeted HTML Container Element
    const mapInstance = mapplsClassObject.Map({
      id: containerId,
      properties: mapProps
    });

    // Handle map load event listeners
    mapInstance.on("load", () => {
      console.log("Mappls Map loaded at", center);
    });
  };

  // Initialize the SDK with your access token if not already done
  if (!isInitialized) {
    mapplsClassObject.initialize(accessToken, loadOptions, () => {
      isInitialized = true;
      startMap();
    });
  } else {
    // If already initialized, just start the map instance
    startMap();
  }
}