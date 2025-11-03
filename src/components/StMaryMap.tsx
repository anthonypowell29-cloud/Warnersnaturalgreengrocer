import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const StMaryMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState("");
  const [tokenSubmitted, setTokenSubmitted] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || !tokenSubmitted || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [-77.0, 18.3], // St. Mary Parish, Jamaica coordinates
      zoom: 10,
      pitch: 45,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      "top-right"
    );

    // Add a marker for St. Mary
    new mapboxgl.Marker({ color: "#28a745" })
      .setLngLat([-77.0, 18.3])
      .setPopup(
        new mapboxgl.Popup().setHTML(
          "<h3 class='font-bold'>St. Mary Parish</h3><p>Heart of Jamaica's Fresh Produce</p>"
        )
      )
      .addTo(map.current);

    // Add layer for St. Mary boundary (approximate)
    map.current.on("load", () => {
      if (!map.current) return;
      
      map.current.addSource("st-mary", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {
            name: "St. Mary Parish",
          },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-77.2, 18.5],
                [-76.8, 18.5],
                [-76.8, 18.1],
                [-77.2, 18.1],
                [-77.2, 18.5],
              ],
            ],
          },
        },
      });

      map.current.addLayer({
        id: "st-mary-fill",
        type: "fill",
        source: "st-mary",
        paint: {
          "fill-color": "#28a745",
          "fill-opacity": 0.2,
        },
      });

      map.current.addLayer({
        id: "st-mary-outline",
        type: "line",
        source: "st-mary",
        paint: {
          "line-color": "#28a745",
          "line-width": 3,
        },
      });
    });

    return () => {
      map.current?.remove();
    };
  }, [tokenSubmitted, mapboxToken]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mapboxToken) {
      setTokenSubmitted(true);
    }
  };

  if (!tokenSubmitted) {
    return (
      <Card className="glass border-white/20">
        <CardHeader>
          <CardTitle>Configure Mapbox</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mapbox-token">Mapbox Public Token</Label>
              <Input
                id="mapbox-token"
                type="text"
                placeholder="pk.eyJ1..."
                value={mapboxToken}
                onChange={(e) => setMapboxToken(e.target.value)}
                className="bg-white/50 border-white/20"
              />
              <p className="text-xs text-muted-foreground">
                Get your token from{" "}
                <a
                  href="https://mapbox.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  mapbox.com
                </a>
              </p>
            </div>
            <Button type="submit" className="w-full gradient-primary text-white">
              Load Map
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-white/20">
      <CardHeader>
        <CardTitle>St. Mary Parish, Jamaica</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={mapContainer} className="w-full h-[500px] rounded-lg" />
      </CardContent>
    </Card>
  );
};

export default StMaryMap;
