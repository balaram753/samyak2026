"use client";

import {
  CardHandGallery,
  type FanCardItem,
} from "@/components/ui/card-hand-gallery";

const cards: FanCardItem[] = [
  {
    id: "deep-field",
    src: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
    title: "Deep Field",
    description:
      "A diver held inside a sunset horizon, the seascape cut to the shape of a profile. Printed at 300gsm on uncoated stock.",
  },
  {
    id: "city-exposure",
    src: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=600&q=80",
    title: "City Exposure",
    description:
      "Double exposure of a portrait and a skyline at dusk, where the streetlights read as freckles across the jaw.",
  },
  {
    id: "motion-study",
    src: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=600&q=80",
    title: "Motion Study",
    description:
      "One long exposure, one turn of the head. The orange backdrop stays still while everything in front of it smears.",
  },
  {
    id: "kinetic-bloom",
    src: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
    title: "Kinetic Bloom",
    description:
      "A racket dissolving mid-swing into a cloud of colour, drawn the moment the follow-through leaves the frame.",
  },
  {
    id: "paper-flight",
    src: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80",
    title: "Paper Flight",
    description:
      "A cut-paper bird threaded between two fingers, the only colour in an otherwise black and white plate.",
  },
];

export default function CardHandGalleryDemo() {
  return (
    <div className="flex w-full items-center justify-center bg-background px-6 py-10">
      <CardHandGallery cards={cards} className="max-w-5xl" />
    </div>
  );
}
