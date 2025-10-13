/**
 * Onboarding Flow Component
 * Main orchestrator for the mobile onboarding experience
 */

import React, { useState, useEffect } from 'react';
import MethodSelector from '../../components/onboarding/MethodSelector';
import OnboardingWardrobe from '../../components/onboarding/OnboardingWardrobe';
import CameraUpload from '../../components/onboarding/CameraUpload';
import { OnboardingSession } from '../../lib/utils/onboarding-session';

const OnboardingFlow = () => {
  const [currentStep, setCurrentStep] = useState('method_selection');
  const [session, setSession] = useState(null);
  const [items, setItems] = useState([]);
  const [progress, setProgress] = useState({
    itemCount: 0,
    targetItems: 5,
    canProceed: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize session on component mount
  useEffect(() => {
    const newSession = new OnboardingSession();
    setSession(newSession);
    console.log('🚀 Onboarding session initialized:', newSession.sessionId);
  }, []);

  // Update progress when items change
  useEffect(() => {
    if (session) {
      const sessionProgress = session.getProgress();
      setProgress({
        itemCount: sessionProgress.totalItems,
        targetItems: sessionProgress.targetItems,
        canProceed: sessionProgress.canProceed
      });
      setItems(session.getItems());
    }
  }, [session]);

  const handleMethodSelect = (method) => {
    console.log('📱 Method selected:', method);
    
    if (method === 'complete') {
      handleComplete();
      return;
    }

    switch (method) {
      case 'camera':
        setCurrentStep('camera_upload');
        break;
      case 'social':
        setCurrentStep('social_connect');
        break;
      case 'receipt':
        setCurrentStep('receipt_upload');
        break;
      default:
        console.warn('Unknown method:', method);
    }
  };

  const handleUpload = async (uploadData) => {
    // TODO: Implement unified upload API integration
    // For now, show "Coming Soon" message
    setError('Mobile onboarding upload is coming soon! Please use the existing "Multi-Item Detection" or "My Wardrobe" sections for now.');
    setCurrentStep('method_selection');
  };

  const handleEditItem = (itemId) => {
    console.log('✏️ Edit item:', itemId);
    // TODO: Implement item editing
  };

  const handleDeleteItem = (itemId) => {
    if (!session) return;
    
    console.log('🗑️ Delete item:', itemId);
    session.removeItem(itemId);
    setItems(session.getItems());
    setProgress(session.getProgress());
  };

  const handleAddMore = () => {
    setCurrentStep('method_selection');
  };

  const handleComplete = async () => {
    if (!session) return;
    
    setIsLoading(true);
    
    try {
      console.log('🎉 Completing onboarding...');
      
      // Complete the session
      const finalWardrobe = session.completeSession();
      
      // TODO: Save to permanent storage
      // await saveWardrobeToDatabase(finalWardrobe);
      
      console.log('✅ Onboarding completed:', finalWardrobe.summary);
      
      // TODO: Navigate to main app
      // navigate('/main');
      
    } catch (error) {
      console.error('❌ Completion error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'camera_upload':
      case 'social_connect':
      case 'receipt_upload':
        setCurrentStep('method_selection');
        break;
      case 'wardrobe_review':
        setCurrentStep('method_selection');
        break;
      default:
        setCurrentStep('method_selection');
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'method_selection':
        return (
          <MethodSelector
            onMethodSelect={handleMethodSelect}
            progress={progress}
            isLoading={isLoading}
          />
        );

      case 'camera_upload':
        return (
          <CameraUpload
            onUpload={handleUpload}
            onBack={handleBack}
            isLoading={isLoading}
            uploadType="single"
          />
        );

      case 'wardrobe_review':
        return (
          <OnboardingWardrobe
            items={items}
            progress={progress}
            onAddMore={handleAddMore}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
            onComplete={handleComplete}
            onBack={handleBack}
          />
        );

      case 'social_connect':
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Social Media Connect
              </h2>
              <p className="text-gray-600 mb-6">
                Coming soon! Social media integration will be available in the next update.
              </p>
              <button
                onClick={handleBack}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
              >
                Go Back
              </button>
            </div>
          </div>
        );

      case 'receipt_upload':
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Receipt Upload
              </h2>
              <p className="text-gray-600 mb-6">
                Coming soon! Receipt upload will be available in the next update.
              </p>
              <button
                onClick={handleBack}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
              >
                Go Back
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Unknown Step
              </h2>
              <p className="text-gray-600 mb-6">
                Something went wrong. Please try again.
              </p>
              <button
                onClick={() => setCurrentStep('method_selection')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
              >
                Start Over
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Work in Progress Banner */}
      <div className="bg-blue-50 border-b border-blue-200 p-4">
        <div className="max-w-7xl mx-auto flex items-center space-x-3">
          <div className="text-blue-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-blue-800">Mobile Onboarding - Coming Soon!</h3>
            <p className="text-sm text-blue-700">
              This unified mobile onboarding experience is under development. Please use <strong>"🔍 Multi-Item Detection"</strong> or <strong>"👚 My Wardrobe"</strong> for now.
            </p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="fixed top-20 left-4 right-4 z-50 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3">
          <div className="flex-1">
            <h3 className="font-medium text-red-800">Notice</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content */}
      {renderCurrentStep()}
    </div>
  );
};

export default OnboardingFlow;
