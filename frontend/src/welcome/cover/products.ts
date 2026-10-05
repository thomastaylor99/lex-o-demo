/**
 * The hero still-life: three packshots from `/products/<id>.png`, cut out of their white
 * background with a clip-path traced from each silhouette (percent of the full image, inset
 * 1.5 px). Placement is in artboard pixels inside the still-life frame.
 */
export interface HeroProduct {
  id: string;
  /** Image size, then the tight box around the product: left, top, width, height. */
  image: [number, number];
  box: [number, number, number, number];
  clip: string;
  /** Height on the artboard, horizontal centre, baseline, tilt and stacking. */
  height: number;
  centre: number;
  bottom: number;
  tilt: number;
  layer: number;
  /** The float cycle in seconds, and its offset so the three never move together. */
  float: [number, number];
}

export const HERO: HeroProduct[] = [
  {
    id: "lop-revitalift-clinical-vitc-serum",
    image: [800, 800],
    box: [292, 41, 218, 733],
    clip: "polygon(48.8% 5.3%, 48.3% 5.2%, 47.1% 5.9%, 45.7% 7.4%, 45.1% 9.0%, 45.1% 16.9%, 44.4% 21.1%, 42.8% 21.4%, 44.3% 21.5%, 40.4% 21.9%, 39.6% 22.4%, 39.3% 32.1%, 39.7% 35.6%, 37.6% 36.2%, 36.8% 37.2%, 36.7% 93.9%, 38.7% 95.8%, 40.2% 96.5%, 51.2% 96.6%, 50.9% 96.6%, 60.9% 96.5%, 63.6% 94.1%, 63.6% 37.1%, 62.8% 36.1%, 60.8% 35.8%, 60.7% 35.5%, 60.7% 22.8%, 59.6% 21.9%, 54.9% 21.4%, 54.2% 16.5%, 53.9% 8.5%, 53.2% 7.0%, 52.2% 6.0%, 50.8% 5.2%, 50.2% 5.3%)",
    height: 640,
    centre: 440,
    bottom: 760,
    tilt: 0,
    layer: 1,
    float: [7.2, 0],
  },
  {
    id: "lrp-toleriane-sensitive-riche",
    image: [332, 800],
    box: [12, 18, 306, 766],
    clip: "polygon(5.3% 2.4%, 4.1% 3.0%, 4.7% 8.6%, 6.5% 11.9%, 7.1% 12.0%, 9.5% 18.9%, 10.1% 19.0%, 15.5% 41.8%, 17.9% 60.6%, 18.5% 61.3%, 19.7% 75.0%, 20.3% 75.5%, 20.3% 78.4%, 22.1% 79.2%, 22.1% 94.9%, 23.9% 96.1%, 28.2% 97.1%, 34.5% 97.6%, 45.6% 97.8%, 55.6% 97.8%, 70.9% 97.2%, 74.2% 96.6%, 77.3% 95.0%, 77.9% 91.9%, 77.9% 79.0%, 79.1% 78.5%, 79.7% 76.0%, 83.9% 42.5%, 89.3% 20.0%, 92.3% 12.6%, 95.3% 7.9%, 95.3% 2.6%, 94.1% 2.4%)",
    height: 560,
    centre: 262,
    bottom: 822,
    tilt: -7,
    layer: 2,
    float: [8.0, -2.4],
  },
  {
    id: "cerave-moisturising-cream",
    image: [736, 800],
    box: [18, 20, 700, 761],
    clip: "polygon(7.0% 2.7%, 4.3% 2.8%, 3.3% 3.2%, 2.6% 4.2%, 2.6% 21.6%, 2.9% 21.9%, 2.6% 22.5%, 2.6% 87.9%, 2.9% 89.4%, 4.0% 91.1%, 5.9% 92.6%, 8.1% 93.6%, 13.9% 95.1%, 29.0% 96.9%, 44.5% 97.4%, 55.2% 97.4%, 71.0% 96.9%, 79.1% 96.1%, 87.3% 94.9%, 91.1% 93.9%, 93.5% 92.9%, 96.0% 90.9%, 96.8% 89.4%, 97.1% 85.6%, 96.8% 83.9%, 97.2% 82.6%, 97.4% 28.7%, 97.1% 22.4%, 96.8% 22.1%, 97.1% 21.9%, 97.1% 4.0%, 95.7% 2.8%, 15.1% 2.7%)",
    height: 316,
    centre: 630,
    bottom: 866,
    tilt: 4,
    layer: 3,
    float: [6.6, -4.1],
  },
];
