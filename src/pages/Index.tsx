import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import DynamicHomepage from "@/components/storefront/DynamicHomepage";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <DynamicHomepage />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
