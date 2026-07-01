import krishna from "@/assets/designs/krishna-flute-melody.jpg";
import ganesh from "@/assets/designs/shree-ganesh-golden-aura.jpg";
import shiva from "@/assets/designs/om-namah-shivaya-cosmic.jpg";
import football from "@/assets/designs/football-glory-moment.jpg";
import cricket from "@/assets/designs/cricket-stadium-lights.jpg";
import porsche from "@/assets/designs/porsche-911-sunset-drive.jpg";
import lambo from "@/assets/designs/midnight-lambo-neon.jpg";

export type Category = "Devotional" | "Sports" | "Automotive";

export type Product = {
  slug: string;
  title: string;
  category: Category;
  price: number;
  image: string;
  description: string;
};

export const products: Product[] = [
  {
    slug: "krishna-flute-melody",
    title: "Krishna's Flute Melody",
    category: "Devotional",
    price: 749,
    image: krishna,
    description:
      "A serene rendering of Lord Krishna playing the bansuri under a moonlit sky — hand-finished with subtle gold accents.",
  },
  {
    slug: "shree-ganesh-golden-aura",
    title: "Shree Ganesh — Golden Aura",
    category: "Devotional",
    price: 749,
    image: ganesh,
    description:
      "Lord Ganesha bathed in a warm golden aura — a blessing of prosperity for your home or workspace.",
  },
  {
    slug: "om-namah-shivaya-cosmic",
    title: "Om Namah Shivaya — Cosmic",
    category: "Devotional",
    price: 749,
    image: shiva,
    description:
      "Lord Shiva in cosmic meditation — inky blues and celestial highlights for a deeply contemplative wall piece.",
  },
  {
    slug: "cricket-stadium-lights",
    title: "Cricket — Stadium Lights",
    category: "Sports",
    price: 749,
    image: cricket,
    description:
      "Floodlights, roaring crowds and the electric hum of a night match — nostalgia for every cricket fan.",
  },
  {
    slug: "football-glory-moment",
    title: "Football — Glory Moment",
    category: "Sports",
    price: 749,
    image: football,
    description:
      "The freeze-frame of a match-winning strike — dynamic composition perfect for a den or games room.",
  },
  {
    slug: "porsche-911-sunset-drive",
    title: "Porsche 911 — Coastal Drive",
    category: "Automotive",
    price: 749,
    image: porsche,
    description:
      "The 911 silhouette carving a coastal road at golden hour — timeless design meets timeless machine.",
  },
  {
    slug: "midnight-lambo-neon",
    title: "Midnight Lambo — Neon Tokyo",
    category: "Automotive",
    price: 749,
    image: lambo,
    description:
      "A neon-drenched Lamborghini prowling Tokyo backstreets — high-contrast art for the bold collector.",
  },
];

export type Size = {
  id: "xs" | "s" | "m" | "l";
  code: string;
  label: string;
  dims: string;
  delta: number;
  useCase: string;
  scale: string;
};

export const sizes: Size[] = [
  {
    id: "xs",
    code: "XS",
    label: 'XS · 8×12"',
    dims: '8×12 inch',
    delta: 0,
    useCase: "Perfect for study tables, office desks, or open shelves.",
    scale: "About the size of an A4 sheet.",
  },
  {
    id: "s",
    code: "S",
    label: 'S · 12×18"',
    dims: '12×18 inch',
    delta: 300,
    useCase: "Great above bedside tables, reading nooks, or a small gallery wall.",
    scale: "Roughly the size of a standard laptop screen.",
  },
  {
    id: "m",
    code: "M",
    label: 'M · 16×20"',
    dims: '16×20 inch',
    delta: 650,
    useCase: "Ideal centerpiece above sofas, consoles, or a study bed.",
    scale: "Around the size of a large kitchen tray.",
  },
  {
    id: "l",
    code: "L",
    label: 'L · 20×30"',
    dims: '20×30 inch',
    delta: 1250,
    useCase: "A statement piece for living-room feature walls and entryways.",
    scale: "Close to the size of a folded newspaper spread.",
  },
];

export type FrameType = {
  id: "direct" | "mount";
  label: string;
  tagline: string;
  description: string;
  priceDelta: number;
};

export const frameTypes: FrameType[] = [
  {
    id: "direct",
    label: "Direct Frame",
    tagline: "Print edge-to-edge, no border",
    description:
      "Artwork runs right to the frame edge. Bold, modern look — best when you want the design to fill the wall.",
    priceDelta: 0,
  },
  {
    id: "mount",
    label: "Mount Frame",
    tagline: "White matboard border around the print",
    description:
      "A crisp museum-style matboard surrounds the artwork. Elegant, gallery-inspired finish that draws the eye in.",
    priceDelta: 200,
  },
];

export const frameFinishes = [
  { id: "black", label: "Matte Black", swatch: "#111111" },
  { id: "walnut", label: "Walnut Wood", swatch: "#6b4226" },
  { id: "oak", label: "Natural Oak", swatch: "#c9a97a" },
  { id: "gold", label: "Antique Gold", swatch: "#b8892b" },
];

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}
