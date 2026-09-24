import PyramidSequenceHero from '../components/PyramidSequenceHero/PyramidSequenceHero';
import AboutSection from '../components/About/AboutSection';
import EventsSection from '../components/Events/EventsSection';
import ScheduleSection from '../components/Schedule/ScheduleSection';
import GallerySection from '../components/Gallery/GallerySection';
import SponsorsSection from '../components/Sponsors/SponsorsSection';
import ContactSection from '../components/Contact/ContactSection';

export default function Home() {
  return (
    <div className="w-full relative">
      {/* 300-Frame Cinematic Pyramid Scroll Experience */}
      <PyramidSequenceHero />

      {/* About Section */}
      <AboutSection showLink={true} />

      {/* Flagship Events Section (3D Holographic Arena) */}
      <EventsSection limit={6} showFilter={true} showViewAll={true} isHomePage={true} />

      {/* 3-Day Schedule Roadmap */}
      <ScheduleSection />

      {/* Gallery & Archives */}
      <GallerySection />

      {/* Ecosystem Sponsors */}
      <SponsorsSection />

      {/* Contact Section */}
      <ContactSection />
    </div>
  );
}
