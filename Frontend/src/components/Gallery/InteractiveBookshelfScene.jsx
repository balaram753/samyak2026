import { BookshelfScene } from "@designcodeio/threeui";
import "@designcodeio/threeui/style.css";

export function Scene() {
  return (
    <div className="shader-frame relative w-full h-[76svh] min-h-[520px] sm:h-[88vh] sm:min-h-[720px] overflow-hidden bg-[#171a24] rounded-2xl border border-neutral-800 shadow-2xl">
      <BookshelfScene />
    </div>
  );
}

export default Scene;
