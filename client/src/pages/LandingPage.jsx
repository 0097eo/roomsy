import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/NavBar';
import { Pencil, ImagePlus, X } from "lucide-react";
import Footer from '../components/Footer';

const LandingPage = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    minPrice: '',
    maxPrice: '',
    minCapacity: '',
    amenities: [],
  });

  const possibleAmenities = [
    'WiFi', 
    'Parking', 
    'Kitchen', 
    'Air Conditioning', 
    'Projector', 
    'Meeting Room'
  ];

  const [perPage] = useState(8);
  const [modalOpen, setModalOpen] = useState(false);
  const [newSpace, setNewSpace] = useState({
    name: '',
    description: '',
    address: '',
    capacity: '',
    hourly_price: '',
    daily_price: '',
    status: 'AVAILABLE',
    amenities: [],
    rules: [],
    images: []  
  });

  const [imagePreviews, setImagePreviews] = useState({
    primary: null,
    additional: []
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSpace((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const errors = [];
    
    if (!newSpace.name) errors.push('Name is required');
    if (!newSpace.description) errors.push('Description is required');
    if (!newSpace.address) errors.push('Address is required');
    if (!newSpace.capacity) errors.push('Capacity is required');
    if (!newSpace.hourly_price) errors.push('Hourly price is required');
    if (!newSpace.daily_price) errors.push('Daily price is required');
    
    return errors;
  };

  const handleCreateSpace = async () => {
    // Validate form
    const validationErrors = validateForm();
    
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }
  
    try {
      const formData = new FormData();
      
      // Add text fields
      formData.append('name', newSpace.name || '');
      formData.append('description', newSpace.description || '');
      formData.append('address', newSpace.address || '');
      formData.append('capacity', newSpace.capacity || '0');
      formData.append('hourly_price', newSpace.hourly_price || '0');
      formData.append('daily_price', newSpace.daily_price || '0');
      formData.append('status', newSpace.status || 'AVAILABLE');
      
      // Ensure amenities is an array
      const amenitiesArray = Array.isArray(newSpace.amenities) 
        ? newSpace.amenities 
        : newSpace.amenities 
          ? [newSpace.amenities] 
          : [];
  
      // Convert amenities array to JSON string for backend if required
      const amenitiesJson = JSON.stringify(amenitiesArray);
  
      // Ensure rules is an array
      const rulesArray = Array.isArray(newSpace.rules) 
        ? newSpace.rules 
        : newSpace.rules 
          ? [newSpace.rules] 
          : [];
  
      // Convert rules array to JSON string for backend if required
      const rulesJson = JSON.stringify(rulesArray);
      
      // Append amenities and rules as JSON strings
      formData.append('amenities', amenitiesJson);
      formData.append('rules', rulesJson);
      
      // Handle images (both primary and additional)
      if (newSpace.images && newSpace.images.length > 0) {
        newSpace.images.forEach((img) => {
          // Ensure we're only appending File objects
          if (img instanceof File) {
            formData.append('images', img);
          }
        });
      }

      const response = await fetch('/api/spaces', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
        body: formData,
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error Response:', errorData);
        throw new Error(errorData.error || 'Failed to create space');
      }
  
      const data = await response.json();
      setSpaces((prev) => [data.space, ...prev]);
      
      // Reset form and close modal
      setNewSpace({
        name: '',
        description: '',
        address: '',
        capacity: '',
        hourly_price: '',
        daily_price: '',
        status: 'AVAILABLE',
        amenities: [],
        rules: [],
        images: []
      });
      setImagePreviews({
        primary: null,
        additional: []
      });
      setModalOpen(false);
      setError(null);
    } catch (err) {
      console.error('Create Space Error:', err);
      setError(err.message);
    }
  };

  const toggleAmenity = (amenity) => {
    setNewSpace(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleImageChange = (e, type) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const updatedImages = type === 'primary' 
        ? [files[0], ...newSpace.images.slice(1)] 
        : [...newSpace.images, ...files];
        
      setNewSpace((prev) => ({
        ...prev, 
        images: updatedImages
      }));

      const previews = files.map(file => {
        const reader = new FileReader();
        return new Promise((resolve) => {
          reader.onloadend = () => {
            resolve(reader.result);
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(previews).then(results => {
        setImagePreviews((prev) => ({
          ...prev,
          [type === 'primary' ? 'primary' : 'additional']: results
        }));
      });
    }
  };

  const removeAdditionalImage = (indexToRemove) => {
    setNewSpace(prev => ({
      ...prev,
      images: prev.images.filter((_, index) => index !== indexToRemove)
    }));
    setImagePreviews(prev => ({
      ...prev,
      additional: prev.additional.filter((_, index) => index !== indexToRemove)
    }));
  };

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    const fetchSpaces = async () => {
      if (loading || !user?.token) return;

      setFetchLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams({
          search: filters.search,
          page: page.toString(),
          per_page: perPage.toString(),
          status: filters.status,
        });

        if (filters.minPrice) queryParams.append('min_price', filters.minPrice);
        if (filters.maxPrice) queryParams.append('max_price', filters.maxPrice);
        if (filters.minCapacity) queryParams.append('min_capacity', filters.minCapacity);
        
        if (filters.amenities.length > 0) {
          filters.amenities.forEach(amenity => {
            queryParams.append('amenities', amenity);
          });
        }

        const response = await fetch(`/api/spaces?${queryParams.toString()}`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch spaces');
        }

        const data = await response.json();
        setSpaces(data.spaces);
        setTotalPages(data.pagination.total_pages);
      } catch (err) {
        setError(err.message);
      } finally {
        setFetchLoading(false);
      }
    };

    fetchSpaces();
  }, [filters, page, perPage, user?.token, loading]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setPage(1);
  };

  const handleAmenityToggle = (amenity) => {
    setFilters(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
    setPage(1);
  };

  const handleSpaceClick = (id) => {
    navigate(`/spaces/${id}`);
  };

  // Loading state while checking authentication
  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="bg-white min-h-screen">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 bg-gray-50 p-6 rounded-lg shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search spaces..."
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />

            <select 
              name="status" 
              value={filters.status} 
              onChange={handleFilterChange}
              className="w-full p-3 border rounded-lg"
            >
              <option value="">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="BOOKED">Booked</option>
            </select>

            <div className="flex space-x-2">
              <input
                type="number"
                name="minPrice"
                value={filters.minPrice}
                onChange={handleFilterChange}
                placeholder="Min Price"
                className="w-full p-3 border rounded-lg"
              />
              <input
                type="number"
                name="maxPrice"
                value={filters.maxPrice}
                onChange={handleFilterChange}
                placeholder="Max Price"
                className="w-full p-3 border rounded-lg"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {possibleAmenities.map(amenity => (
              <button
                key={amenity}
                onClick={() => handleAmenityToggle(amenity)}
                className={`px-3 py-1 rounded-full text-sm ${
                  filters.amenities.includes(amenity) 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {amenity}
              </button>
            ))}
          </div>
        </div>

        {fetchLoading ? (
          <div className="text-center py-8">Loading spaces...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-8">{error}</div>
        ) : spaces.length === 0 ? (
          <div className="text-center py-8">No spaces found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {spaces.map(space => (
              <div 
                key={space.id} 
                onClick={() => handleSpaceClick(space.id)}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
              >
                <img 
                  src={
                    space?.images && Array.isArray(space.images) && space.images.length > 0 
                      ? space.images[0] 
                      : 'https://images.unsplash.com/photo-1732559797723-4af87682e682?q=80&w=1886&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
                  } 
                  alt={space.name || 'Space'} 
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold">{space.name}</h3>
                    <span className="text-blue-600 font-semibold">
                      KES {space.hourly_price}/hr
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-2 truncate">
                    {space.description}
                  </p>
                  <div className="flex items-center text-gray-500 text-sm">
                    Capacity: {space.capacity}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-center items-center space-x-4">
          <button 
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            disabled={page === 1}
            className="p-2 rounded-full bg-gray-100 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-full bg-gray-100 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-6 right-6 flex items-center justify-center bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition duration-300 ease-in-out"
      >
        <Pencil className="mr-2 w-5 h-5" />
        Create
      </button>


      {/* Modal */}
      {modalOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 w-[500px] max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Create New Space</h2>
            <button 
              onClick={() => setModalOpen(false)}
              className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition duration-300 ease-in-out"
            >
              <X size={24} className="w-5 h-5" />
              <span>Close</span>
            </button>

          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Image Upload */}
          <div className="space-y-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Images (Primary + Additional)
              </label>
              <div className="flex items-center space-x-4">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <div className="w-24 h-24 border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-blue-500">
                    {imagePreviews.primary ? (
                      <img 
                        src={imagePreviews.primary} 
                        alt="Primary preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImagePlus className="text-gray-400" />
                    )}
                  </div>
                </label>
              </div>
              <div className="flex space-x-2 mt-2">
                {imagePreviews.additional.map((preview, index) => (
                  <div key={index} className="relative">
                    <img 
                      src={preview} 
                      alt={`Additional ${index + 1}`} 
                      className="w-24 h-24 object-cover"
                    />
                    <button 
                      onClick={() => removeAdditionalImage(index)}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Space Details Inputs */}
            <input
              type="text"
              name="name"
              placeholder="Name"
              value={newSpace.name}
              onChange={handleInputChange}
              className="w-full p-3 border rounded-lg"
            />
            <textarea
              name="description"
              placeholder="Description"
              value={newSpace.description}
              onChange={handleInputChange}
              className="w-full p-3 border rounded-lg"
            ></textarea>
            <input
              type="text"
              name="address"
              placeholder="Address"
              value={newSpace.address}
              onChange={handleInputChange}
              className="w-full p-3 border rounded-lg"
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                name="capacity"
                placeholder="Capacity"
                value={newSpace.capacity}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-lg"
              />
              <input
                type="number"
                name="hourly_price"
                placeholder="Hourly Price"
                value={newSpace.hourly_price}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                name="daily_price"
                placeholder="Daily Price"
                value={newSpace.daily_price}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-lg"
              />
              <select
                name="status"
                value={newSpace.status}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-lg"
              >
                <option value="AVAILABLE">Available</option>
                <option value="BOOKED">Booked</option>
              </select>
            </div>

            {/* Amenities Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Amenities
              </label>
              <div className="flex flex-wrap gap-2">
                {possibleAmenities.map(amenity => (
                  <button
                    type="button"
                    key={amenity}
                    onClick={() => toggleAmenity(amenity)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      newSpace.amenities.includes(amenity) 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {amenity}
                  </button>
                ))}
              </div>
            </div>

            {/* Rules Input */}
            <textarea
              name="rules"
              placeholder="Space Rules"
              value={newSpace.rules}
              onChange={handleInputChange}
              className="w-full p-3 border rounded-lg"
            ></textarea>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSpace}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Create Space
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    <Footer/>
    </div>
  );
};

export default LandingPage;