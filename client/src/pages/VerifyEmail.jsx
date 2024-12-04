import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    verification_code: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Get email from session storage (set during registration)
    const email = sessionStorage.getItem('registrationEmail');
    if (email) {
      setFormData(prev => ({
        ...prev,
        email
      }));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('api/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Clear the email from session storage
        sessionStorage.removeItem('registrationEmail');
        // Redirect to login page after successful verification
        navigate('/login');
      } else {
        setError(data.message || 'Verification failed');
      }
    } catch (err) {
      setError('Network error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="w-1/2 bg-gray-800">
        <img
          src="https://images.unsplash.com/photo-1536494126589-29fadf0d7e3c?q=80&w=1936&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Verification illustration"
          className="object-cover h-screen w-full"
        />
      </div>

      <div className="w-1/2 flex items-center justify-center">
        <div className="max-w-md w-full px-6">
          <h2 className="text-3xl font-extrabold text-center mb-6">
            Verify Your Email
          </h2>
          
          <p className="text-center text-gray-600 mb-6">
            Please enter the verification code sent to your email address.
          </p>

          {error && (
            <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label 
                htmlFor="email" 
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                readOnly
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label 
                htmlFor="verification_code" 
                className="block text-sm font-medium text-gray-700"
              >
                Verification Code
              </label>
              <input
                type="text"
                id="verification_code"
                name="verification_code"
                value={formData.verification_code}
                onChange={handleChange}
                required
                placeholder="Enter 6-digit code"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>
            </div>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600">
            Didn't receive the code?{' '}
            <button 
              onClick={() => {
                alert('Resend functionality to be implemented');
              }}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Resend Code
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;