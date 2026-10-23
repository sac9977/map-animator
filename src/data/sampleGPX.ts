/**
 * Ready-to-load authentic GPX tracks for instant testing
 */

export interface SampleGPXTrack {
  id: string;
  title: string;
  location: string;
  description: string;
  xml: string;
}

export const SAMPLE_GPX_TRACKS: SampleGPXTrack[] = [
  {
    id: 'kilimanjaro-machame',
    title: 'Mount Kilimanjaro Summit (Machame Route)',
    location: 'Tanzania · 5,895m Peak',
    description: 'High-altitude volcanic trail from Machame Gate to Uhuru Peak via Barranco Wall & Stella Point.',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="MapAnimator" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Mount Kilimanjaro Machame Expedition</name>
    <desc>Authentic volcanic ascent to Uhuru Peak 5,895m</desc>
  </metadata>
  <wpt lat="-3.0758" lon="37.3533">
    <name>Uhuru Peak (5,895m Summit)</name>
    <ele>5895</ele>
  </wpt>
  <wpt lat="-3.1389" lon="37.2889">
    <name>Machame Camp</name>
    <ele>3020</ele>
  </wpt>
  <trk>
    <name>Kilimanjaro Summit Ridge</name>
    <trkseg>
      <trkpt lat="-3.1764" lon="37.2431"><ele>1828</ele></trkpt>
      <trkpt lat="-3.1610" lon="37.2550"><ele>2150</ele></trkpt>
      <trkpt lat="-3.1480" lon="37.2690"><ele>2540</ele></trkpt>
      <trkpt lat="-3.1389" lon="37.2889"><ele>3020</ele></trkpt>
      <trkpt lat="-3.1250" lon="37.3010"><ele>3400</ele></trkpt>
      <trkpt lat="-3.1110" lon="37.3180"><ele>3840</ele></trkpt>
      <trkpt lat="-3.0990" lon="37.3290"><ele>4200</ele></trkpt>
      <trkpt lat="-3.0910" lon="37.3380"><ele>4630</ele></trkpt>
      <trkpt lat="-3.0820" lon="37.3460"><ele>5200</ele></trkpt>
      <trkpt lat="-3.0780" lon="37.3505"><ele>5685</ele></trkpt>
      <trkpt lat="-3.0758" lon="37.3533"><ele>5895</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`,
  },
  {
    id: 'serengeti-mara-river',
    title: 'Serengeti Mara River Wilderness Trail',
    location: 'Northern Serengeti, Tanzania',
    description: 'Off-road walking safari along the Mara riverbank, granite kopjes, and acacia savannah.',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="MapAnimator" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Mara River Wilderness Walking Safari</name>
  </metadata>
  <trk>
    <name>Mara River Wildlife Trail</name>
    <trkseg>
      <trkpt lat="-1.5620" lon="34.9210"><ele>1420</ele></trkpt>
      <trkpt lat="-1.5540" lon="34.9350"><ele>1415</ele></trkpt>
      <trkpt lat="-1.5420" lon="34.9490"><ele>1410</ele></trkpt>
      <trkpt lat="-1.5310" lon="34.9620"><ele>1405</ele></trkpt>
      <trkpt lat="-1.5190" lon="34.9810"><ele>1398</ele></trkpt>
      <trkpt lat="-1.5080" lon="35.0020"><ele>1390</ele></trkpt>
      <trkpt lat="-1.4980" lon="35.0180"><ele>1385</ele></trkpt>
      <trkpt lat="-1.4850" lon="35.0350"><ele>1380</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`,
  },
  {
    id: 'yosemite-mist-trail',
    title: 'Yosemite Mist Trail to Nevada Fall',
    location: 'California, USA',
    description: 'Iconic granite trail climbing alongside Vernal & Nevada Falls in Yosemite National Park.',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="MapAnimator" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Mist Trail Yosemite Ascent</name>
  </metadata>
  <trk>
    <name>Mist Trail & Nevada Fall</name>
    <trkseg>
      <trkpt lat="37.7327" lon="-119.5579"><ele>1230</ele></trkpt>
      <trkpt lat="37.7280" lon="-119.5490"><ele>1380</ele></trkpt>
      <trkpt lat="37.7250" lon="-119.5420"><ele>1540</ele></trkpt>
      <trkpt lat="37.7220" lon="-119.5350"><ele>1690</ele></trkpt>
      <trkpt lat="37.7180" lon="-119.5310"><ele>1820</ele></trkpt>
      <trkpt lat="37.7120" lon="-119.5330"><ele>1805</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`,
  },
];
