"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { 
  FileText, 
  Search, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  User,
  GraduationCap,
  Award,
  FileCheck
} from 'lucide-react';
import {
  adminListTeacherVerificationsApi,
  adminApproveVerificationApi,
  adminRejectVerificationApi,
  adminRequestInfoApi,
  adminGetVerificationDocumentUrlApi,
  ITeacherVerification,
  VerificationStatus,
  ITeacherVerificationListResponse
} from '@/api/admin.rest';

export function AdminTeacherVerification() {
  const [verifications, setVerifications] = useState<ITeacherVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [selectedVerification, setSelectedVerification] = useState<ITeacherVerification | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isRequestInfoDialogOpen, setIsRequestInfoDialogOpen] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [viewingDocument, setViewingDocument] = useState<{ url: string; name: string } | null>(null);
  const { toast } = useToast();

  // Fetch verifications from API
  const fetchVerifications = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };
      
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      
      const response: ITeacherVerificationListResponse = await adminListTeacherVerificationsApi(params);
      setVerifications(response.data);
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (error: any) {
      console.error('Failed to fetch verifications:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to fetch verifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, searchTerm, toast]);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchVerifications();
      } else {
        setPagination(prev => ({ ...prev, page: 1 }));
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [statusFilter]);

  // Calculate stats
  const stats = {
    total: pagination.total,
    pending: verifications.filter(v => v.status === 'pending').length,
    approved: verifications.filter(v => v.status === 'approved').length,
    rejected: verifications.filter(v => v.status === 'rejected').length,
    infoNeeded: verifications.filter(v => v.status === 'info_needed').length,
  };

  // Get status badge variant
  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'under_review':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Under Review</Badge>;
      case 'info_needed':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Info Needed</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle view details
  const handleViewDetails = async (verification: ITeacherVerification) => {
    setSelectedVerification(verification);
    setIsDetailDialogOpen(true);
  };

  // Handle approve
  const handleApprove = async () => {
    if (!selectedVerification) return;

    try {
      await adminApproveVerificationApi(selectedVerification.id, actionNotes || undefined);
      toast({
        title: "Success",
        description: "Verification approved successfully",
      });
      setIsApproveDialogOpen(false);
      setActionNotes('');
      setSelectedVerification(null);
      await fetchVerifications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to approve verification",
        variant: "destructive",
      });
    }
  };

  // Handle reject
  const handleReject = async () => {
    if (!selectedVerification || !actionNotes.trim()) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive",
      });
      return;
    }

    try {
      await adminRejectVerificationApi(selectedVerification.id, actionNotes);
      toast({
        title: "Success",
        description: "Verification rejected",
      });
      setIsRejectDialogOpen(false);
      setActionNotes('');
      setSelectedVerification(null);
      await fetchVerifications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to reject verification",
        variant: "destructive",
      });
    }
  };

  // Handle request info
  const handleRequestInfo = async () => {
    if (!selectedVerification || !actionNotes.trim()) {
      toast({
        title: "Error",
        description: "Please provide information request details",
        variant: "destructive",
      });
      return;
    }

    try {
      await adminRequestInfoApi(selectedVerification.id, actionNotes);
      toast({
        title: "Success",
        description: "Information request sent",
      });
      setIsRequestInfoDialogOpen(false);
      setActionNotes('');
      setSelectedVerification(null);
      await fetchVerifications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to request information",
        variant: "destructive",
      });
    }
  };

  // Handle view document
  const handleViewDocument = async (
    verificationId: string, 
    documentType: 'identity_card_front' | 'identity_card_back' | 'degree_certificate' | 'teaching_certificate' | 'cv',
    documentName: string,
    index?: number
  ) => {
    try {
      const { url } = await adminGetVerificationDocumentUrlApi(verificationId, documentType, index);
      setViewingDocument({ url, name: documentName });
    } catch (error: any) {
      console.error('Error loading document:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || `Failed to load document: ${documentName}`,
        variant: "destructive",
      });
    }
  };

  if (loading && verifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Teacher Verification Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Teacher Verification Management</h2>
          <p className="text-muted-foreground">Review and approve teacher verification applications</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Info Needed</p>
                <p className="text-2xl font-bold">{stats.infoNeeded}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by username or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="info_needed">Info Needed</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Verifications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Verifications ({pagination.total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : verifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No verifications found
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Resubmissions</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {verifications.map((verification) => (
                    <TableRow key={verification.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {verification.user?.avatar_url ? (
                            <img 
                              src={verification.user.avatar_url} 
                              alt={verification.user.username}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="h-4 w-4 text-gray-500" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{verification.user?.username || 'N/A'}</div>
                            <div className="text-sm text-muted-foreground">{verification.user?.email || 'N/A'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(verification.status)}</TableCell>
                      <TableCell>{formatDate(verification.last_submitted_at || verification.created_at)}</TableCell>
                      <TableCell>{verification.resubmission_count}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(verification)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          {verification.status === 'pending' || verification.status === 'under_review' || verification.status === 'info_needed' ? (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                  setSelectedVerification(verification);
                                  setActionNotes('');
                                  setIsApproveDialogOpen(true);
                                }}
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setSelectedVerification(verification);
                                  setActionNotes('');
                                  setIsRejectDialogOpen(true);
                                }}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Reject
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-orange-200 text-orange-700 hover:bg-orange-50"
                                onClick={() => {
                                  setSelectedVerification(verification);
                                  setActionNotes('');
                                  setIsRequestInfoDialogOpen(true);
                                }}
                              >
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Request Info
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} verifications
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 z-[101]">
          <DialogHeader>
            <DialogTitle>Verification Details</DialogTitle>
            <DialogDescription>
              Review all submitted documents and information
            </DialogDescription>
          </DialogHeader>
          {selectedVerification && (
            <div className="space-y-6">
              {/* User Info */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Teacher Information
                </h3>
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <Label className="text-xs text-muted-foreground">Username</Label>
                    <p className="font-medium">{selectedVerification.user?.username || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedVerification.user?.email || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Identity Documents */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Identity Documents
                </h3>
                <div className="space-y-2">
                  {selectedVerification.documents?.identity_card_front && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDocument(selectedVerification.id, 'identity_card_front', 'Identity Card Front')}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View Identity Card (Front)
                    </Button>
                  )}
                  {selectedVerification.documents?.identity_card_back && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDocument(selectedVerification.id, 'identity_card_back', 'Identity Card Back')}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View Identity Card (Back)
                    </Button>
                  )}
                </div>
              </div>

              {/* Certificates */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Degree Certificates
                </h3>
                <div className="space-y-2">
                  {selectedVerification.degree_certificates && selectedVerification.degree_certificates.length > 0 ? (
                    selectedVerification.degree_certificates.map((cert: any, idx: number) => (
                      <div key={cert.id || idx} className="p-3 bg-muted rounded-lg flex justify-between items-center">
                        <div>
                          <p className="font-medium">{cert.name}</p>
                          <p className="text-sm text-muted-foreground">Year: {cert.year}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDocument(selectedVerification.id, 'degree_certificate', cert.name, idx)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No degree certificates</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Teaching Certificates
                </h3>
                <div className="space-y-2">
                  {selectedVerification.teaching_certificates && selectedVerification.teaching_certificates.length > 0 ? (
                    selectedVerification.teaching_certificates.map((cert: any, idx: number) => (
                      <div key={cert.id || idx} className="p-3 bg-muted rounded-lg flex justify-between items-center">
                        <div>
                          <p className="font-medium">{cert.name}</p>
                          <p className="text-sm text-muted-foreground">{cert.issuer} - {cert.year}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDocument(selectedVerification.id, 'teaching_certificate', cert.name, idx)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No teaching certificates</p>
                  )}
                </div>
              </div>

              {/* Additional Info */}
              <div>
                <h3 className="font-semibold mb-2">Additional Information</h3>
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Years of Experience</Label>
                    <p>{selectedVerification.additional_info?.years_of_experience || 'N/A'}</p>
                  </div>
                  {selectedVerification.cv_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDocument(selectedVerification.id, 'cv', 'CV')}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View CV
                    </Button>
                  )}
                  <div>
                    <Label className="text-xs text-muted-foreground">Previous Platforms</Label>
                    <p>{selectedVerification.previous_platforms?.join(', ') || 'N/A'}</p>
                  </div>
                  {selectedVerification.references && selectedVerification.references.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">References</Label>
                      <div className="space-y-1">
                        {selectedVerification.references.map((ref: any, idx: number) => (
                          <div key={ref.id || idx} className="text-sm">
                            <p className="font-medium">{ref.name}</p>
                            <p className="text-xs text-muted-foreground">{ref.email} - {ref.relationship}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Notes */}
              {selectedVerification.admin_notes && (
                <div>
                  <h3 className="font-semibold mb-2">Admin Notes</h3>
                  <p className="p-3 bg-muted rounded-lg">{selectedVerification.admin_notes}</p>
                </div>
              )}

              {/* Rejection Reason */}
              {selectedVerification.rejection_reason && (
                <div>
                  <h3 className="font-semibold mb-2 text-red-600">Rejection Reason</h3>
                  <p className="p-3 bg-red-50 rounded-lg text-red-700">{selectedVerification.rejection_reason}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Verification</DialogTitle>
            <DialogDescription>
              Approve this teacher verification application
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Add any notes for this approval..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsApproveDialogOpen(false);
              setActionNotes('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Verification</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this verification
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rejection Reason *</Label>
              <Textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Explain why this verification is being rejected..."
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsRejectDialogOpen(false);
              setActionNotes('');
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Info Dialog */}
      <Dialog open={isRequestInfoDialogOpen} onOpenChange={setIsRequestInfoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Additional Information</DialogTitle>
            <DialogDescription>
              Request the teacher to provide additional information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Information Request *</Label>
              <Textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Specify what additional information is needed..."
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsRequestInfoDialogOpen(false);
              setActionNotes('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleRequestInfo} className="bg-orange-600 hover:bg-orange-700">
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Viewer Dialog */}
      <Dialog open={!!viewingDocument} onOpenChange={() => setViewingDocument(null)}>
        <DialogContent className="max-w-4xl bg-white dark:bg-gray-900 z-[101]">
          <DialogHeader>
            <DialogTitle>{viewingDocument?.name}</DialogTitle>
          </DialogHeader>
          {viewingDocument && (
            <div className="w-full h-[600px] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
              {viewingDocument.url.startsWith('data:') ? (
                // Base64 image
                <img
                  src={viewingDocument.url}
                  alt={viewingDocument.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                // PDF file
                <iframe
                  src={viewingDocument.url}
                  className="w-full h-full border-0"
                  title={viewingDocument.name}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

