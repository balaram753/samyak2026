import PyramidSequenceHero from '../components/PyramidSequenceHero/PyramidSequenceHero';
import TechVideoSpotlight from '../components/Events/TechVideoSpotlight';
import AboutSection from '../components/About/AboutSection';
import FeaturedWorkshopSpotlight from '../components/Workshops/FeaturedWorkshopSpotlight';
import EventsSection from '../components/Events/EventsSection';
import SponsorsSection from '../components/Sponsors/SponsorsSection';
import ContactSection from '../components/Contact/ContactSection';

export default function Home() {
  return (
    <div className="w-full relative">
      {/* 300-Frame Cinematic Pyramid Scroll Experience */}
      <PyramidSequenceHero />

      {/* Featured Technical Teaser Video Spotlight */}
      <TechVideoSpotlight />

      {/* About Section */}
      <AboutSection showLink={true} />

      {/* Flagship Technical Workshop Highlight (Above Events) */}
      <FeaturedWorkshopSpotlight />

      {/* Flagship Events Section (3D Holographic Arena) */}
      <EventsSection limit={6} showFilter={true} showViewAll={true} isHomePage={true} />

      {/* Ecosystem Sponsors */}
      <SponsorsSection />

      {/* Contact Section */}
      <ContactSection />
    </div>
  );
}
