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
  VerificationStatus,
  type SubmitVerificationDto,
  type VerificationStatusResponse,
} from '@/api/teachers.rest';
import { 
  getPresignedUploadUrlApi,
  uploadFileApi,
} from '@/api/storage.rest';

export default function TeacherVerificationPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatusResponse | null>(null);
  
  // Form state
  const [identityCardFront, setIdentityCardFront] = useState<File | null>(null);
  const [identityCardBack, setIdentityCardBack] = useState<File | null>(null);
  const [degreeCertificates, setDegreeCertificates] = useState<File[]>([]);
  const [teachingCertificates, setTeachingCertificates] = useState<File[]>([]);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [yearsOfExperience, setYearsOfExperience] = useState<string>('');
  const [previousPlatforms, setPreviousPlatforms] = useState<string>('');
  const [references, setReferences] = useState<Array<{ name: string; email: string; relationship: string }>>([]);

  // Upload progress
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    loadVerificationStatus();
  }, []);

  const loadVerificationStatus = async () => {
    try {
      setStatusLoading(true);
      const status = await getVerificationStatusApi();
      setVerificationStatus(status);
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

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const key = `${folder}/${Date.now()}-${file.name}`;
    
    try {
      // Get pre-signed URL
      const { url } = await getPresignedUploadUrlApi({
        key,
        mimeType: file.type,
        folder,
      });

      // Upload file
      await uploadFileApi(file, url);
      
      return key;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const handleFileUpload = async (file: File, type: 'identity_front' | 'identity_back' | 'degree' | 'teaching' | 'cv') => {
    try {
      const folder = `teacher-verification/${type}`;
      const key = await uploadFile(file, folder);
      return key;
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!identityCardFront || !identityCardBack) {
      toast({
        title: "Required Fields",
        description: "Please upload both sides of your identity card",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Upload all files
      const identityCardFrontKey = await handleFileUpload(identityCardFront, 'identity_front');
      const identityCardBackKey = await handleFileUpload(identityCardBack, 'identity_back');
      
      const degreeKeys = await Promise.all(
        degreeCertificates.map(file => handleFileUpload(file, 'degree'))
      );
      
      const teachingKeys = await Promise.all(
        teachingCertificates.map(file => handleFileUpload(file, 'teaching'))
      );
      
      let cvUrl: string | undefined;
      if (cvFile) {
        const cvKey = await handleFileUpload(cvFile, 'cv');
        cvUrl = cvKey;
      }

      // Prepare submission data
      const submitData: SubmitVerificationDto = {
        identity_card_front: identityCardFrontKey,
        identity_card_back: identityCardBackKey,
        degree_certificates: degreeKeys.map((key, index) => ({
          name: degreeCertificates[index].name,
          key,
        })),
        teaching_certificates: teachingKeys.map((key, index) => ({
          name: teachingCertificates[index].name,
          key,
        })),
        cv_url: cvUrl,
        years_of_experience: yearsOfExperience ? parseInt(yearsOfExperience) : undefined,
        previous_platforms: previousPlatforms ? previousPlatforms.split(',').map(p => p.trim()) : undefined,
        references: references.length > 0 ? references : undefined,
      };

      await submitVerificationApi(submitData);
      
      toast({
        title: "Success",
        description: "Verification documents submitted successfully. Please wait for admin review.",
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
                    accept="image/*,.pdf"
                    onChange={(e) => setIdentityCardFront(e.target.files?.[0] || null)}
                    required
                  />
                </div>
                <div>
                  <Label>Back Side *</Label>
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setIdentityCardBack(e.target.files?.[0] || null)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Degree Certificates */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Degree Certificates (Optional)</Label>
              <Input
                type="file"
                accept="image/*,.pdf"
                multiple
                onChange={(e) => setDegreeCertificates(Array.from(e.target.files || []))}
              />
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
                accept="image/*,.pdf"
                multiple
                onChange={(e) => setTeachingCertificates(Array.from(e.target.files || []))}
              />
              {teachingCertificates.length > 0 && (
                <div className="text-sm text-gray-600">
                  {teachingCertificates.length} file(s) selected
                </div>
              )}
            </div>

            {/* CV/Resume */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">CV/Resume (Optional)</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setCvFile(e.target.files?.[0] || null)}
              />
            </div>

            {/* Additional Info */}
            <div className="space-y-4">
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

