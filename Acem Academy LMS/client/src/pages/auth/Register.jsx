import AuthLayout from "@/layouts/AuthLayout";
import RegisterForm from "@/components/forms/RegisterForm";

function Register() {
  return (
    <AuthLayout>
      <RegisterForm />
    </AuthLayout>
  );
}

export default Register;