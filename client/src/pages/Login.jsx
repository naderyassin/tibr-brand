import { useNavigate } from "react-router-dom";
import LoginCard from "@/components/auth/LoginCard";

export default function Login() {
  const navigate = useNavigate();
  return (
    <div className="auth-page">
      <LoginCard onSuccess={() => navigate("/shop")} />
    </div>
  );
}
