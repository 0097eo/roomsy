import { Users, Briefcase, PartyPopper, Home, Globe } from "lucide-react";
import Navbar from "../components/NavBar";
import { useNavigate } from "react-router-dom";

const AboutPage = () => {
    const navigate = useNavigate()

    const handleExplore=()=>{
        navigate('/spaces')
    }

    const handleListSpaces=()=>{
        navigate('/spaces')
    }
  return (
    <>
    <Navbar />
    <div className="bg-gray-100 text-gray-800 min-h-screen">
      {/* Header Section */}
      <header className="bg-gradient-to-r from-gray-500 to-gray-800 text-white py-10">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">About Roomsy</h1>
          <p className="text-lg">
            Bringing people together to meet, create, and celebrate in unique spaces.
          </p>
        </div>
      </header>

      {/* Mission Statement Section */}
      <section className="py-12">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
            <p className="text-lg leading-relaxed mb-6">
              At Roomsy, we strive to connect like-minded individuals passionate about sharing experiences in unique spaces. Whether you're planning a creative collaboration, hosting a memorable celebration, or organizing a professional meeting, we make it seamless to find the perfect space.
            </p>
          </div>
          <div>
            <img
              src="https://images.unsplash.com/photo-1544928147-79a2dbc1f389?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGNvbW11bml0eSUyMHJvb218ZW58MHx8MHx8fDA%3D"
              alt="Community gathering"
              className="rounded-lg shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* Problem and Solution Section */}
      <section className="bg-white py-12">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">What We Solve</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Problem Cards */}
            <div className="bg-gray-50 p-6 rounded-lg shadow-md text-center">
              <Home className="text-blue-500 w-12 h-12 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Space Accessibility</h3>
              <p>
                Finding the right space for your needs can be challenging. We make it simple to discover and book spaces online.
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg shadow-md text-center">
              <Users className="text-blue-500 w-12 h-12 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Community Building</h3>
              <p>
                We connect people who share similar passions, fostering a sense of community in creative environments.
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg shadow-md text-center">
              <Briefcase className="text-blue-500 w-12 h-12 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Monetization for Owners</h3>
              <p>
                Property owners can easily lease their spaces, creating an additional source of income.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Why Choose Us?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature Cards */}
            <div className="text-center">
              <Globe className="text-teal-500 w-12 h-12 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Global Reach</h3>
              <p>
                Find spaces in cities across the globe, tailored to your specific needs.
              </p>
            </div>
            <div className="text-center">
              <PartyPopper className="text-teal-500 w-12 h-12 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Memorable Experiences</h3>
              <p>
                Host events that leave a lasting impression in unique, inspiring spaces.
              </p>
            </div>
            <div className="text-center">
              <Briefcase className="text-teal-500 w-12 h-12 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Professional Support</h3>
              <p>
                Our team ensures seamless bookings and excellent customer service for every experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="bg-gradient-to-r from-gray-500 to-gray-800 text-white py-12">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Join Our Community</h2>
          <p className="text-lg mb-6">
            Ready to find the perfect space for your next activity or share your space with others? Start today.
          </p>
          <div className="space-x-4">
            <button
              className="bg-white text-blue-500 px-6 py-3 rounded-full font-semibold hover:bg-gray-200 transition duration-300"
              onClick={handleExplore}
            >
              Explore Spaces
            </button>
            <button
              className="bg-white text-teal-500 px-6 py-3 rounded-full font-semibold hover:bg-gray-200 transition duration-300"
              onClick={handleListSpaces}
            >
              List Your Space
            </button>
          </div>
        </div>
      </section>
    </div>
    </>
  );
};

export default AboutPage;
