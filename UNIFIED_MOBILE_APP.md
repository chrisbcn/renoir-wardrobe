# Unified Mobile App - Maura Wardrobe

## Overview

This is the unified mobile-first wardrobe onboarding experience that consolidates all existing PoCs into a cohesive, progressive onboarding flow.

## Architecture

### Core Components

#### 1. Unified Analyzer (`src/lib/analyzers/unified-analyzer.js`)
- **Purpose**: Single entry point for all wardrobe analysis
- **Supports**: Single images, outfit images, receipts, social media
- **Features**: Automatic input type detection, unified output format

#### 2. Image Standardizer (`src/lib/standardization/image-standardizer.js`)
- **Purpose**: Generate AI-standardized product images
- **Integration**: Nano Banana API for professional product photography
- **Fallback**: Basic processing when AI generation fails

#### 3. Onboarding Session (`src/lib/utils/onboarding-session.js`)
- **Purpose**: Manage temporary wardrobe during onboarding
- **Features**: Progress tracking, method usage, item management

#### 4. Unified Upload API (`src/api/upload/unified-upload.js`)
- **Purpose**: Single endpoint for all upload methods
- **Features**: Session management, error handling, progress tracking

### Mobile Components

#### 1. Method Selector (`src/components/onboarding/MethodSelector.jsx`)
- **Purpose**: Choose upload method (camera, social, receipt)
- **Features**: Progress tracking, method switching

#### 2. Onboarding Wardrobe (`src/components/onboarding/OnboardingWardrobe.jsx`)
- **Purpose**: Review and manage items during onboarding
- **Features**: Item editing, deletion, progress display

#### 3. Camera Upload (`src/components/onboarding/CameraUpload.jsx`)
- **Purpose**: Camera and gallery upload interface
- **Features**: File validation, preview, batch upload

#### 4. Onboarding Flow (`src/screens/onboarding/OnboardingFlow.jsx`)
- **Purpose**: Main orchestrator for onboarding experience
- **Features**: Step management, state coordination

## Key Features

### Progressive Onboarding
- **Minimum 5 items** to demonstrate value
- **Multiple entry methods** to reduce friction
- **Seamless navigation** between upload methods
- **Real-time progress tracking**

### Image Standardization
- **AI-generated standardized images** using Nano Banana
- **Consistent product photography** style
- **Fallback processing** for reliability
- **Quality validation** and improvement suggestions

### Unified Analysis
- **Single API endpoint** for all upload types
- **Automatic input detection** and routing
- **Consistent output format** across all methods
- **Error handling** and recovery

### Mobile-First Design
- **Touch-optimized interface** for iOS/Android
- **Responsive components** for all screen sizes
- **Progressive enhancement** features
- **Offline capability** (planned)

## Usage

### 1. Start Onboarding
```javascript
// Navigate to onboarding section
setActiveSection('onboarding');
```

### 2. Upload Items
```javascript
// Single image upload
await handleUpload({
  type: 'single_image',
  images: [base64ImageData]
});

// Outfit image upload
await handleUpload({
  type: 'outfit_image',
  images: [base64ImageData]
});
```

### 3. Complete Onboarding
```javascript
// When minimum items reached
const finalWardrobe = session.completeSession();
```

## API Endpoints

### Unified Upload
```
POST /api/upload/unified-upload
Content-Type: application/json

{
  "user_id": "string",
  "input_type": "single_image|outfit_image|receipt_image|receipt_text|social_media",
  "image_data": "base64_string",
  "receipt_data": "string",
  "social_data": "object",
  "session_id": "string",
  "options": "object"
}
```

### Session Management
```
GET /api/upload/unified-upload?session_id=string
POST /api/upload/complete-session
```

## Configuration

### Environment Variables
```bash
# Required
CLAUDE_API_KEY=your_claude_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key

# Optional
NANOBANANA_API_KEY=your_nanobanana_key
INSTAGRAM_CLIENT_ID=your_instagram_client_id
PINTEREST_CLIENT_ID=your_pinterest_client_id
```

## Development Status

### ✅ Completed
- [x] Unified analyzer architecture
- [x] Image standardizer with AI generation
- [x] Onboarding session management
- [x] Mobile-first UI components
- [x] Unified upload API
- [x] Progressive onboarding flow

### 🚧 In Progress
- [ ] Social media integration
- [ ] Receipt upload interface
- [ ] Image cropping implementation
- [ ] Error handling improvements

### 📋 Planned
- [ ] Offline capability
- [ ] Push notifications
- [ ] Analytics integration
- [ ] Performance optimization
- [ ] Testing suite

## Testing

### Manual Testing
1. Navigate to "📱 Mobile Onboarding" in the app
2. Test each upload method
3. Verify progress tracking
4. Test item editing/deletion
5. Complete onboarding flow

### API Testing
```bash
# Test unified upload
curl -X POST http://localhost:3000/api/upload/unified-upload \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","input_type":"single_image","image_data":"base64data"}'
```

## Next Steps

1. **Implement social media connectors** (Instagram/Pinterest)
2. **Add receipt upload interface** with text input
3. **Implement image cropping** for outfit items
4. **Add comprehensive error handling**
5. **Create mobile app build** for iOS/Android
6. **Add analytics and monitoring**

## Architecture Benefits

### For Users
- **Single, intuitive flow** for all upload methods
- **Progressive engagement** with clear milestones
- **Consistent experience** across all platforms
- **Fast, reliable processing** with fallbacks

### For Developers
- **Unified codebase** reduces maintenance
- **Modular architecture** enables easy extension
- **Consistent APIs** simplify integration
- **Mobile-first design** ensures scalability

### For Business
- **Higher conversion rates** through progressive onboarding
- **Reduced support burden** with better UX
- **Scalable architecture** supports growth
- **Data consistency** across all channels
