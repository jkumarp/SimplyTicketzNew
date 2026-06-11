import { mappls } from 'mappls-web-maps';
import { MAPPLS_TOKEN } from '@/config';

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

    // Add a marker at the center once the map is loaded
    mapInstance.on("load", () => {
      // Using the global mappls object for marker creation if available
      if ((window as any).mappls && (window as any).mappls.Marker) {
        new (window as any).mappls.Marker({
          map: mapInstance,
          position: { lat: center[0], lng: center[1] }
        });
      }
    });
  };

  // Initialize the SDK with the token from config
  if (!isInitialized && MAPPLS_TOKEN) {
    mapplsClassObject.initialize(MAPPLS_TOKEN, loadOptions, () => {
      isInitialized = true;
      startMap();
    });
  } else if (isInitialized) {
    startMap();
  } else {
    console.error("Mappls Access Token is missing in environment variables.");
  }
}