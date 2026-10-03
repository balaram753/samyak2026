import {
  splitTypographyProps,
  usePageTypography,
  type PageTypographyProps,
} from "./pageTypography";
import { LandingPageFrame, type LandingPageProps } from "./LandingPageFrame";
import { COMPLETE_SHELF_TYPOGRAPHY } from "./pageRecipes";

export type CompleteShelfLandingPageProps = LandingPageProps & PageTypographyProps;

export function CompleteShelfLandingPage(props: CompleteShelfLandingPageProps) {
  const [type, frame] = splitTypographyProps(props);
  const customization = usePageTypography(COMPLETE_SHELF_TYPOGRAPHY, type);
  return (
    <LandingPageFrame
      {...frame}
      customization={customization}
      title="SAMYAK 2026 — Fest Chronicles"
      sourceUrl="/landing-pages/complete-shelf-v2.html"
    />
  );
}

export default CompleteShelfLandingPage;
