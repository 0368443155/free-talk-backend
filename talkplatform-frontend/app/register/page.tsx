"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, UserPlus } from "lucide-react";
import { registerApi } from "@/api/user.rest";
import { useToast } from "@/components/ui/use-toast";
import { useReferral } from "@/hooks/useReferral";
import { validateReferralCodeApi } from "@/api/affiliate.rest";
import { CheckCircle2, XCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { getReferralCode } = useReferral();

  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    referralCode: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [referralCodeValidation, setReferralCodeValidation] = useState<{
    valid: boolean;
    message?: string;
    referrer_name?: string;
  } | null>(null);
  const [validatingReferralCode, setValidatingReferralCode] = useState(false);

  const validateForm = () => {
    const errors: string[] = [];

    // Email validation
    if (!formData.email.trim()) {
      errors.push("Email is required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push("Please enter a valid email address");
    }

    // Username validation
    if (!formData.username.trim()) {
      errors.push("Username is required");
    } else if (formData.username.length < 3) {
      errors.push("Username must be at least 3 characters long");
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.push("Username can only contain letters, numbers, and underscores");
    }

    // Password validation
    if (!formData.password.trim()) {
      errors.push("Password is required");
    } else if (formData.password.length < 6) {
      errors.push("Password must be at least 6 characters long");
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.push("Password must contain at least one uppercase letter, one lowercase letter, and one number");
    }

    // Confirm password validation
    if (!formData.confirmPassword.trim()) {
      errors.push("Please confirm your password");
    } else if (formData.password !== formData.confirmPassword) {
      errors.push("Passwords do not match");
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(". "));
      return;
    }

    setIsLoading(true);
    setError("");

    // Validate referral code if provided
    if (formData.referralCode.trim()) {
      if (!referralCodeValidation?.valid) {
        setError("Please enter a valid referral code or leave it empty");
        return;
      }
    }

    try {
      await registerApi({
        email: formData.email.trim().toLowerCase(),
        username: formData.username.trim(),
        password: formData.password,
        referralCode: formData.referralCode.trim() || undefined, // Use input field value
      });

      toast({
        title: "Success",
        description: "Account created successfully! Please login.",
      });

      // Redirect to login page
      router.push("/login");
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || "Registration failed. Please try again.";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Validate referral code on change (debounced)
    if (name === 'referralCode') {
      const code = value.trim().toUpperCase();
      if (code.length > 0) {
        // Debounce validation
        const timeoutId = setTimeout(async () => {
          setValidatingReferralCode(true);
          try {
            const result = await validateReferralCodeApi(code);
            setReferralCodeValidation(result);
          } catch (error) {
            setReferralCodeValidation({
              valid: false,
              message: 'Failed to validate referral code'
            });
          } finally {
            setValidatingReferralCode(false);
          }
        }, 500);

        return () => clearTimeout(timeoutId);
      } else {
        setReferralCodeValidation(null);
      }
    }
  };

  // Load referral code from URL/storage on mount
  useEffect(() => {
    const storedCode = getReferralCode();
    if (storedCode) {
      setFormData(prev => ({
        ...prev,
        referralCode: storedCode.toUpperCase()
      }));
      // Validate the stored code
      validateReferralCodeApi(storedCode.toUpperCase()).then(result => {
        setReferralCodeValidation(result);
      });
    }
  }, [getReferralCode]);

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-accent/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <Card className="w-full max-w-md relative z-10 glass-card border-white/20">
        <CardHeader className="space-y-1 pb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-center font-heading bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Create Account
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Join us and start your journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={isLoading}
                className="h-11 bg-white/50 border-white/20 focus:border-primary focus:ring-primary backdrop-blur-sm transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                Username
              </Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="Choose a username"
                value={formData.username}
                onChange={handleInputChange}
                required
                disabled={isLoading}
                className="h-11 bg-white/50 border-white/20 focus:border-primary focus:ring-primary backdrop-blur-sm transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  className="h-11 bg-white/50 border-white/20 focus:border-primary focus:ring-primary backdrop-blur-sm pr-10 transition-all"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  className="h-11 bg-white/50 border-white/20 focus:border-primary focus:ring-primary backdrop-blur-sm pr-10 transition-all"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>

            {/* Referral Code Field */}
            <div className="space-y-2">
              <Label htmlFor="referralCode" className="text-sm font-medium">
                Referral Code <span className="text-muted-foreground text-xs">(Optional)</span>
              </Label>
              <div className="relative">
                <Input
                  id="referralCode"
                  name="referralCode"
                  type="text"
                  placeholder="Enter referral code (e.g., ABC123)"
                  value={formData.referralCode}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="h-11 bg-white/50 border-white/20 focus:border-primary focus:ring-primary backdrop-blur-sm transition-all uppercase"
                  style={{ textTransform: 'uppercase' }}
                />
                {formData.referralCode.trim() && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {validatingReferralCode ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : referralCodeValidation?.valid ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : referralCodeValidation ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : null}
                  </div>
                )}
              </div>
              {formData.referralCode.trim() && referralCodeValidation && (
                <div className={`text-xs ${referralCodeValidation.valid ? 'text-green-600' : 'text-red-600'}`}>
                  {referralCodeValidation.valid ? (
                    <span>✓ Valid referral code from {referralCodeValidation.referrer_name}</span>
                  ) : (
                    <span>✗ {referralCodeValidation.message}</span>
                  )}
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-semibold shadow-lg shadow-primary/20 transition-all duration-200"
              disabled={isLoading || (formData.referralCode.trim().length > 0 && validatingReferralCode)}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create account
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-transparent px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            <div className="mt-4">
              <Button
                variant="outline"
                className="w-full h-11 border-2 border-white/20 bg-white/50 hover:bg-white/80 transition-all"
                onClick={() => {
                  // Redirect to Google OAuth
                  window.location.href = `${window.location.origin}/api/auth/google`;
                }}
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-primary hover:text-secondary transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}