"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  Eye,
  Download
} from 'lucide-react';
import {
  submitVerificationApi,
  getVerificationStatusApi,
  getDocumentUrlApi,
  uploadVerificationFileApi,
  uploadVerificationFilesApi,
  VerificationStatus,
  type SubmitVerificationDto,
  type VerificationStatusResponse,
} from '@/api/teachers.rest';

export default function TeacherVerificationPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatusResponse | null>(null);

  // Form state - Verification documents
  const [identityCardFront, setIdentityCardFront] = useState<File | null>(null);
  const [identityCardBack, setIdentityCardBack] = useState<File | null>(null);
  const [degreeCertificates, setDegreeCertificates] = useState<File[]>([]);
  const [teachingCertificates, setTeachingCertificates] = useState<File[]>([]);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [yearsOfExperience, setYearsOfExperience] = useState<string>('');
  const [previousPlatforms, setPreviousPlatforms] = useState<string>('');
  const [references, setReferences] = useState<Array<{ name: string; email: string; relationship: string }>>([]);
  
  // Form state - Teacher profile info (from modal)
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [introVideoUrl, setIntroVideoUrl] = useState('');
  const [hourlyRate, setHourlyRate] = useState<string>('5');
  const [languagesTaught, setLanguagesTaught] = useState<string>('');
  const [specialties, setSpecialties] = useState<string>('');
  const [country, setCountry] = useState<string>('');

  // Uploaded file URLs
  const [identityCardFrontUrl, setIdentityCardFrontUrl] = useState<string | null>(null);
  const [identityCardBackUrl, setIdentityCardBackUrl] = useState<string | null>(null);
  const [degreeCertificateUrls, setDegreeCertificateUrls] = useState<Array<{ url: string; name: string }>>([]);
  const [teachingCertificateUrls, setTeachingCertificateUrls] = useState<Array<{ url: string; name: string }>>([]);
  const [cvUrl, setCvUrl] = useState<string | null>(null);

  useEffect(() => {
    loadVerificationStatus();
  }, []);

  const loadVerificationStatus = async () => {
    try {
      setStatusLoading(true);
      const status = await getVerificationStatusApi();
      setVerificationStatus(status);
      
      // If verification exists, try to load profile data to pre-fill form
      if (status) {
        try {
          const { getMyTeacherProfileApi } = await import('@/api/teachers.rest');
          const profile = await getMyTeacherProfileApi();
          if (profile) {
            setHeadline(profile.headline || '');
            setBio(profile.bio || '');
            setIntroVideoUrl(profile.intro_video_url || '');
            setHourlyRate(profile.hourly_rate_credits?.toString() || profile.hourly_rate?.toString() || '5');
            setLanguagesTaught(profile.languages_taught?.join(', ') || '');
            setSpecialties(profile.specialties?.map((s: any) => typeof s === 'string' ? s : s.name || s).join(', ') || '');
            setCountry(profile.country || '');
          }
        } catch (e) {
          // Profile might not exist yet, ignore
        }
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        toast({
          title: "Error",
          description: "Failed to load verification status",
          variant: "destructive",
        });
      }
    } finally {
      setStatusLoading(false);
    }
  };

  // Upload file to server
  const handleFileUpload = async (file: File, type: 'identity_front' | 'identity_back' | 'degree' | 'teaching' | 'cv'): Promise<string> => {
    try {
      const { url } = await uploadVerificationFileApi(file, type);
      return url;
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.response?.data?.message || `Failed to upload ${type} file`,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Handle identity card upload
  const handleIdentityCardChange = async (file: File | null, side: 'front' | 'back') => {
    if (!file) {
      if (side === 'front') setIdentityCardFrontUrl(null);
      else setIdentityCardBackUrl(null);
      return;
    }

    try {
      const url = await handleFileUpload(file, side === 'front' ? 'identity_front' : 'identity_back');
      if (side === 'front') {
        setIdentityCardFrontUrl(url);
        setIdentityCardFront(file);
      } else {
        setIdentityCardBackUrl(url);
        setIdentityCardBack(file);
      }
    } catch (error) {
      // Error already handled in handleFileUpload
    }
  };

  // Handle CV upload
  const handleCVChange = async (file: File | null) => {
    if (!file) {
      setCvUrl(null);
      return;
    }

    try {
      const url = await handleFileUpload(file, 'cv');
      setCvUrl(url);
      setCvFile(file);
    } catch (error) {
      // Error already handled in handleFileUpload
    }
  };

  // Handle certificates upload (multiple files)
  const handleCertificatesChange = async (files: File[], type: 'degree' | 'teaching') => {
    if (files.length === 0) {
      if (type === 'degree') setDegreeCertificateUrls([]);
      else setTeachingCertificateUrls([]);
      return;
    }

    try {
      const results = await uploadVerificationFilesApi(files, type);
      const urls = results.map((result, index) => ({
        url: result.url,
        name: files[index].name.replace(/\.[^/.]+$/, ''),
      }));

      if (type === 'degree') {
        setDegreeCertificateUrls(urls);
        setDegreeCertificates(files);
      } else {
        setTeachingCertificateUrls(urls);
        setTeachingCertificates(files);
      }
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.response?.data?.message || `Failed to upload ${type} certificates`,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identityCardFrontUrl || !identityCardBackUrl) {
      toast({
        title: "Required Fields",
        description: "Please upload both sides of your identity card",
        variant: "destructive",
      });
      return;
    }

    if (!headline.trim() || !bio.trim()) {
      toast({
        title: "Required Fields",
        description: "Please fill in headline and bio",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // First, ensure user has teacher profile
      const { becomeTeacherApi, updateMyTeacherProfileApi } = await import('@/api/teachers.rest');
      await becomeTeacherApi();
      
      // Update profile with basic info
      await updateMyTeacherProfileApi({
        headline: headline.trim(),
        bio: bio.trim(),
        introVideoUrl: introVideoUrl.trim() || undefined,
        hourlyRate: parseFloat(hourlyRate) || 5,
      });

      // Prepare submission data with URLs
      const submitData: SubmitVerificationDto = {
        identity_card_front: identityCardFrontUrl,
        identity_card_back: identityCardBackUrl,
        degree_certificates: degreeCertificateUrls.map((item) => ({
          name: item.name,
          file_url: item.url,
          year: new Date().getFullYear(),
        })),
        teaching_certificates: teachingCertificateUrls.map((item) => ({
          name: item.name,
          issuer: 'Unknown',
          file_url: item.url,
          year: new Date().getFullYear(),
        })),
        cv_url: cvUrl || undefined,
        years_of_experience: yearsOfExperience ? parseInt(yearsOfExperience) : undefined,
        previous_platforms: previousPlatforms ? previousPlatforms.split(',').map(p => p.trim()) : undefined,
        references: references.length > 0 ? references : undefined,
      };

      await submitVerificationApi(submitData);

      toast({
        title: "Success",
        description: "Verification documents and profile submitted successfully. Please wait for admin review.",
      });

      await loadVerificationStatus();
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.response?.data?.message || "Failed to submit verification documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.APPROVED:
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
      case VerificationStatus.REJECTED:
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case VerificationStatus.INFO_NEEDED:
        return <Badge className="bg-yellow-500"><AlertCircle className="w-3 h-3 mr-1" />Info Needed</Badge>;
      default:
        return <Badge className="bg-gray-500"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  if (statusLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  // If already verified or pending, show status
  if (verificationStatus && verificationStatus.status !== VerificationStatus.REJECTED) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Verification Status</CardTitle>
            <CardDescription>Your teacher verification application status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status:</span>
              {getStatusBadge(verificationStatus.status)}
            </div>

            {verificationStatus.admin_notes && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Admin Notes:</strong> {verificationStatus.admin_notes}
                </AlertDescription>
              </Alert>
            )}

            {verificationStatus.verified_at && (
              <div className="text-sm text-gray-600">
                Verified at: {new Date(verificationStatus.verified_at).toLocaleString()}
              </div>
            )}

            {verificationStatus.status === VerificationStatus.APPROVED && (
              <Button onClick={() => router.push('/teacher/dashboard')}>
                Go to Teacher Dashboard
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Teacher Verification</CardTitle>
          <CardDescription>
            Submit your documents to become a verified teacher on our platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Identity Card */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Identity Card (Required)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Front Side *</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleIdentityCardChange(e.target.files?.[0] || null, 'front')}
                    required
                  />
                  {identityCardFrontUrl && (
                    <p className="text-xs text-green-600 mt-1">✓ Uploaded successfully</p>
                  )}
                </div>
                <div>
                  <Label>Back Side *</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleIdentityCardChange(e.target.files?.[0] || null, 'back')}
                    required
                  />
                  {identityCardBackUrl && (
                    <p className="text-xs text-green-600 mt-1">✓ Uploaded successfully</p>
                  )}
                </div>
              </div>
            </div>

            {/* Degree Certificates */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Degree Certificates (Optional)</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleCertificatesChange(Array.from(e.target.files || []), 'degree')}
              />
              {degreeCertificateUrls.length > 0 && (
                <p className="text-xs text-green-600 mt-1">✓ {degreeCertificateUrls.length} file(s) uploaded</p>
              )}
              {degreeCertificates.length > 0 && (
                <div className="text-sm text-gray-600">
                  {degreeCertificates.length} file(s) selected
                </div>
              )}
            </div>

            {/* Teaching Certificates */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Teaching Certificates (Optional)</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleCertificatesChange(Array.from(e.target.files || []), 'teaching')}
              />
              {teachingCertificateUrls.length > 0 && (
                <p className="text-xs text-green-600 mt-1">✓ {teachingCertificateUrls.length} file(s) uploaded</p>
              )}
              {teachingCertificates.length > 0 && (
                <div className="text-sm text-gray-600">
                  {teachingCertificates.length} file(s) selected
                </div>
              )}
            </div>

            {/* CV/Resume */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">CV/Resume (Optional - PDF only)</Label>
              <Input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => handleCVChange(e.target.files?.[0] || null)}
              />
              {cvUrl && (
                <p className="text-xs text-green-600 mt-1">✓ CV uploaded successfully</p>
              )}
              {cvFile && cvFile.type !== 'application/pdf' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    CV must be a PDF file. Please select a PDF file.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Teacher Profile Information */}
            <div className="space-y-4 border-t pt-6">
              <Label className="text-base font-semibold">Teacher Profile Information</Label>
              
              <div>
                <Label>Headline *</Label>
                <Input
                  type="text"
                  placeholder="e.g., IELTS 8.0 Tutor with 5 years experience"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">A short tagline describing your expertise</p>
              </div>

              <div>
                <Label>Biography *</Label>
                <Textarea
                  placeholder="Tell students about your background, teaching style, qualifications, etc."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={5}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">Describe your teaching experience and approach</p>
              </div>

              <div>
                <Label>Intro Video URL (Optional)</Label>
                <Input
                  type="url"
                  placeholder="https://youtube.com/..."
                  value={introVideoUrl}
                  onChange={(e) => setIntroVideoUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">Link to your introduction video</p>
              </div>

              <div>
                <Label>Hourly Rate (Credits) *</Label>
                <Input
                  type="number"
                  min="1"
                  step="0.1"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">Your hourly rate in credits</p>
              </div>

              <div>
                <Label>Languages Taught (comma-separated)</Label>
                <Input
                  type="text"
                  placeholder="e.g., English, Spanish, French"
                  value={languagesTaught}
                  onChange={(e) => setLanguagesTaught(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">List languages you can teach</p>
              </div>

              <div>
                <Label>Specialties (comma-separated)</Label>
                <Input
                  type="text"
                  placeholder="e.g., conversation, business, grammar"
                  value={specialties}
                  onChange={(e) => setSpecialties(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">Your teaching specialties</p>
              </div>

              <div>
                <Label>Country</Label>
                <Input
                  type="text"
                  placeholder="e.g., Vietnam"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">Your country of residence</p>
              </div>
            </div>

            {/* Additional Info */}
            <div className="space-y-4 border-t pt-6">
              <Label className="text-base font-semibold">Additional Information</Label>

              <div>
                <Label>Years of Experience</Label>
                <Input
                  type="number"
                  min="0"
                  value={yearsOfExperience}
                  onChange={(e) => setYearsOfExperience(e.target.value)}
                />
              </div>

              <div>
                <Label>Previous Platforms (comma-separated)</Label>
                <Input
                  type="text"
                  placeholder="e.g., iTalki, Preply, Cambly"
                  value={previousPlatforms}
                  onChange={(e) => setPreviousPlatforms(e.target.value)}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Submit Verification
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

