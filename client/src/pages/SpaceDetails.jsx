import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/NavBar';
import Slider from 'react-slick';
import { Share2, Instagram, Mail, X, Phone, Copy } from 'lucide-react';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import Footer from '../components/Footer';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

//placeholder Stripe publishable key
const stripePromise = loadStripe('pk_test_51NE6IvDIBn8bHgYOZX4OodROekrijUm8OHXK9jdB7a2wJlOcNyA9o3OGCnRKSqJOa4Bo0Zg44s14NffMH4SdM0rg00YLtVmrQv');

const SpaceDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAuth();
  const [space, setSpace] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDetails, setBookingDetails] = useState({
    date: '',
    time: '',
    duration: '1',
    start_time: '',
    end_time: '',
  });
  const [bookingError, setBookingError] = useState(null);
  const [paymentClientSecret, setPaymentClientSecret] = useState(null);

  useEffect(()=>{
    if (!loading && !isAuthenticated){
      navigate('/login')
    }
  }, [isAuthenticated, loading, navigate])

  useEffect(() => {
    const fetchSpaceDetails = async () => {
      if (loading || !user?.token) return;

      setFetchLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/spaces/${id}`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch space details');
        }

        const data = await response.json();
        setSpace(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setFetchLoading(false);
      }
    };

    fetchSpaceDetails();
  }, [id, user?.token, loading]);

  const handleImageClick = (image) => {
    setSelectedImage(image);
  };

  const closeModal = () => {
    setSelectedImage(null);
  };

  const handleBookNow = () => {
    setShowBookingModal(true);
    setBookingError(null);
  }

  const handleBookingInputChange = (event) => {
    const { name, value } = event.target;
    
    setBookingDetails(prevDetails => {
      let updatedDetails = { ...prevDetails, [name]: value };
      
      // If both date and time are set, create start_time
      if (updatedDetails.date && updatedDetails.time) {
        updatedDetails.start_time = `${updatedDetails.date}T${updatedDetails.time}:00Z`;
        
        // Calculate end time based on duration
        const startTime = new Date(updatedDetails.start_time);
        const duration = parseInt(updatedDetails.duration || '1', 10);
        const endTime = new Date(startTime.getTime() + duration * 3600000);
        updatedDetails.end_time = endTime.toISOString();
      }
      
      return updatedDetails;
    });
  };

  const BookingForm = () => {
    const stripe = useStripe();
    const elements = useElements();

    const handleBookingSubmit = async (e) => {
      e.preventDefault();
      setBookingError(null);

      try {
        // First, create booking and get payment intent
        const bookingResponse = await fetch(`/api/spaces/${id}/book`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            start_time: bookingDetails.start_time,
            end_time: bookingDetails.end_time,
          }),
        });

        const bookingData = await bookingResponse.json();

        if (!bookingResponse.ok) {
          throw new Error(bookingData.error || 'Failed to initiate booking');
        }

        // Set payment client secret
        setPaymentClientSecret(bookingData.stripe_client_secret);

        // Confirm payment
        if (stripe && elements) {
          const result = await stripe.confirmCardPayment(bookingData.stripe_client_secret, {
            payment_method: {
              card: elements.getElement(CardElement),
              billing_details: {
                name: user.name,
                email: user.email,
              },
            },
          });

          if (result.error) {
            // Payment failed
            throw new Error(result.error.message);
          } else if (result.paymentIntent.status === 'succeeded') {
            // Payment successful
            alert('Booking confirmed!');
            setShowBookingModal(false);
          }
        }
      } catch (err) {
        setBookingError(err.message);
        console.error('Booking error:', err);
      }
    };

    return (
      <form onSubmit={handleBookingSubmit}>
        {bookingError && (
          <div className="mb-4 text-red-500 text-sm">
            {bookingError}
          </div>
        )}
        <div className="mb-4">
          <label htmlFor="date" className="block text-gray-700">
            Date
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={bookingDetails.date}
            onChange={handleBookingInputChange}
            className="w-full px-3 py-2 border rounded-lg"
            required
            min={new Date().toISOString().split('T')[0]} // Prevent booking past dates
          />
        </div>
        <div className="mb-4">
          <label htmlFor="time" className="block text-gray-700">
            Time
          </label>
          <input
            type="time"
            id="time"
            name="time"
            value={bookingDetails.time}
            onChange={handleBookingInputChange}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="duration" className="block text-gray-700">
            Duration (hours)
          </label>
          <input
            type="number"
            id="duration"
            name="duration"
            value={bookingDetails.duration}
            onChange={handleBookingInputChange}
            className="w-full px-3 py-2 border rounded-lg"
            min="1"
            required
          />
        </div>
        {paymentClientSecret && (
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">
              Payment Details
            </label>
            <CardElement 
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
              }}
            />
          </div>
        )}
        <button
          type="submit"
          className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg"
          disabled={!bookingDetails.start_time || !bookingDetails.end_time}
        >
          {paymentClientSecret ? 'Complete Payment' : 'Check Availability'}
        </button>
      </form>
    );
  };

  const BookingModal = () => {
    return showBookingModal ? (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full relative">
          <button
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
            onClick={() => setShowBookingModal(false)}
          >
            <X size={24} />
          </button>
          <h3 className="text-lg font-bold mb-4">Book Space</h3>
          <Elements stripe={stripePromise}>
            <BookingForm />
          </Elements>
        </div>
      </div>
    ) : null;
  };

  const shareContent = {
    title: space?.name || 'Check out this space',
    text: `Check out this amazing space: ${space?.name}`,
    url: window.location.href
  };

  const shareOptions = [
    {
      name: 'Twitter',
      icon: <X/>,
      action: () => {
        const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareContent.text)}&url=${encodeURIComponent(shareContent.url)}`;
        window.open(twitterShareUrl, '_blank');
      }
    },
    {
      name: 'WhatsApp',
      icon: <Phone/>,
      action: () => {
        const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(shareContent.text + ' ' + shareContent.url)}`;
        window.open(whatsappShareUrl, '_blank');
      }
    },
    {
      name: 'Instagram',
      icon: <Instagram/>,
      action: () => {
        const instagramShareUrl = `https://www.instagram.com/create/select/`;
        window.open(instagramShareUrl, '_blank');
        alert('Please paste this link in your Instagram post: ' + shareContent.url);
      }
    },
    {
      name: 'Email',
      icon: <Mail/>,
      action: () => {
        const emailShareUrl = `mailto:?subject=${encodeURIComponent(shareContent.title)}&body=${encodeURIComponent(shareContent.text + '\n\n' + shareContent.url)}`;
        window.open(emailShareUrl);
      }
    },
    {
      name: 'Copy Link',
      icon: <Copy/>,
      action: () => {
        navigator.clipboard.writeText(shareContent.url)
          .then(() => alert('Link copied to clipboard'))
          .catch(err => console.error('Failed to copy: ', err));
      }
    }
  ];

  const handleShare = () => {
    if (navigator.share) {
      navigator.share(shareContent).catch(console.error);
    } else {
      setShowShareOptions(!showShareOptions);
    }
  };

  const carouselSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
  };


  // Check if booking is disabled
  const isBookingDisabled = space?.status?.toLowerCase() === 'booked' || 
                             space?.status?.toLowerCase() === 'maintenance';

  if (fetchLoading) {
    return (
      <div className="bg-white min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">Loading spaces...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 bg-white min-h-screen">
        <div className="bg--50 ">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">{space.name}</h2>
            <div className="relative">
              <button 
                onClick={handleShare} 
                className="text-gray-600 hover:text-blue-500 transition"
                aria-label="Share space"
              >
                <Share2 size={24} />
              </button>
              {showShareOptions && (
                <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-10">
                  {shareOptions.map((option) => (
                    <button
                      key={option.name}
                      onClick={() => {
                        option.action();
                        setShowShareOptions(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center"
                    >
                      <span className="mr-2">{option.icon}</span>
                      {option.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="relative mb-6">
            <Slider {...carouselSettings}>
              {space.images && space.images.length > 0 ? (
                space.images.map((image, index) => (
                  <div key={index} onClick={() => handleImageClick(image)}>
                    <img
                      src={image || '/placeholder.png'}
                      alt={space.name}
                      className="w-full h-96 object-cover rounded-lg shadow-md cursor-pointer"
                    />
                  </div>
                ))
              ) : (
                <div>
                  <img
                    src="/placeholder.png"
                    alt="Placeholder"
                    className="w-full h-96 object-cover rounded-lg shadow-md"
                  />
                </div>
              )}
            </Slider>
            <div className="absolute top-0 right-0 bg-blue-500 text-white p-2 rounded-bl-lg shadow-lg">
              {space.status}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-gray-600 text-normal font-semibold truncate">{space.description}</p>
            </div>
            <div className="text-right md:text-center">
              <span className="text-blue-600 font-semibold">
                KES {space.hourly_price}/hr
              </span>
            </div>
            <div className="text-right">
              <button 
                onClick={handleBookNow}
                disabled={isBookingDisabled}
                className={`px-4 py-2 rounded-lg transition ${
                  isBookingDisabled 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {isBookingDisabled ? 'Unavailable' : 'Book Now'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-bold text-gray-700">Capacity</h4>
              <p>{space.capacity}</p>
            </div>
            <div>
              <h4 className="font-bold text-gray-700">Location</h4>
              <p>{space.address}</p>
            </div>
            <div>
              <h4 className='font-bold text grey-700'>Rules</h4>
              <div className="flex flex-wrap gap-2">
                {space.rules && space.rules.length > 0 ? (
                  space.rules.map((rule, index) => (
                    <p key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">{rule}</p>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No rules specified</p>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-gray-700">Amenities</h4>
              <div className="flex flex-wrap gap-2">
                {space.amenities && space.amenities.length > 0 ? (
                  space.amenities.map((amenity, index) => (
                    <span 
                      key={index} 
                      className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                    >
                      {amenity}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500">No amenities</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for Full-Size Image */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
          onClick={closeModal}
        >
          <div className="relative bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full">
            <img
              src={selectedImage}
              alt="Full-size"
              className="w-full max-h-[80vh] object-contain"
            />
            <button
              className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center"
              onClick={closeModal}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <BookingModal />
      <Footer />
    </div>
  );
};

export default SpaceDetailsPage;