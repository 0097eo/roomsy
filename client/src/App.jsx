import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import SignUpPage from "./pages/Signup";
import VerifyEmailPage from "./pages/VerifyEmail";
import LoginPage from "./pages/Login";
import Homepage from "./pages/Homepage";
import LandingPage from "./pages/LandingPage";
import SpaceDetailsPage from "./pages/SpaceDetails";
import AboutPage from "./pages/About";
import ProfilePage from "./pages/Profile";



const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/verify" element={<VerifyEmailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/spaces" element={<LandingPage />} />
        <Route path="/spaces/:id" element={<SpaceDetailsPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </Router>    
  );
}

export default App;