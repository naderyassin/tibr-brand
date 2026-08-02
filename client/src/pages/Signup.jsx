import { useNavigate } from "react-router-dom";
import SignupCard from "@/components/auth/SignupCard";

export default function Signup() {
  const navigate = useNavigate();
  return (
    <div className="auth-page">
      <SignupCard onSuccess={() => navigate("/login")} />
    </div>
  );
}
