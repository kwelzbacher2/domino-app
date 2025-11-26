# Domino Detection Improvement Roadmap

## Current State (MVP)

The current implementation uses a **heuristic approach** that demonstrates the architecture but has limited accuracy:

### Domino Detection
- ✅ Uses pre-trained COCO-SSD model to detect rectangular objects
- ✅ Filters by aspect ratio (1.5:2.5) to identify domino-shaped objects
- ⚠️ **Limitation**: Will detect any rectangular object with similar proportions
- ⚠️ **Limitation**: May miss dominoes in cluttered scenes or with poor lighting

### Pip Counting
- ✅ Extracts tile regions and splits into left/right halves
- ✅ Applies basic image processing (grayscale, threshold)
- ⚠️ **Limitation**: Uses naive pixel transition counting, not actual blob detection
- ⚠️ **Limitation**: Will return inaccurate pip counts (essentially random low numbers)

### Recommendation for MVP
**Use manual correction (Requirement 5) as the primary input method.** The detection serves as a starting point, but users should verify and correct the results.

---

## Post-MVP Improvement Phases

### Phase 1: Better Classical Computer Vision (Quick Win)
**Timeline**: 1-2 weeks  
**Expected Accuracy**: 70-80% with good lighting  
**Effort**: Medium

#### Improvements:
1. **Proper Blob Detection for Pip Counting**
   - Implement circular Hough transform or SimpleBlobDetector equivalent
   - Filter blobs by circularity, size, and spacing
   - Validate against known pip patterns (1-6 have specific layouts)
   - Handle different domino styles (colored pips, different sizes)

2. **Better Image Preprocessing**
   - Adaptive thresholding instead of fixed threshold
   - Gaussian blur to reduce noise
   - Contrast enhancement for poor lighting
   - Perspective correction for angled shots

3. **Pattern Matching**
   - Create templates for each pip configuration (0-12)
   - Use template matching to validate detected pip counts
   - Reject detections that don't match known patterns

#### Implementation Files:
- `src/services/PipCounter.ts` - Replace `estimatePipCount()` method
- `src/services/ImagePreprocessor.ts` - Add adaptive preprocessing
- `src/utils/pipPatterns.ts` - New file with pip pattern templates

---

### Phase 2: Custom Machine Learning Model (Best Results)
**Timeline**: 4-6 weeks (including data collection)  
**Expected Accuracy**: 90-95%  
**Effort**: High

#### Step 1: Data Collection (2 weeks)
Use the error reporting feature (Requirement 15) to collect training data:

1. **Automatic Collection**
   - Every manual correction generates a labeled training example
   - Store: original image, bounding boxes, pip counts, corrections
   - Target: 500-1000 labeled images

2. **Manual Annotation** (if needed for faster start)
   - Use tools like Roboflow, LabelImg, or CVAT
   - Annotate 200-300 images to bootstrap training
   - Focus on diverse conditions: lighting, angles, backgrounds

#### Step 2: Model Training (1-2 weeks)

**Option A: Two-Stage Approach (Recommended)**
1. **Stage 1: Domino Detection**
   - Fine-tune YOLO or SSD on domino images
   - Input: Full image
   - Output: Bounding boxes for each domino
   - Accuracy target: 95%+ detection rate

2. **Stage 2: Pip Classification**
   - Train CNN classifier on domino half images
   - Input: 100x100 image of domino half
   - Output: Probability distribution over pip counts (0-12)
   - Use transfer learning from MobileNet for faster training
   - Accuracy target: 90%+ correct classification

**Option B: End-to-End Approach**
- Single model that outputs bounding boxes + pip counts
- More complex to train but simpler to deploy
- Consider if you have large dataset (1000+ images)

#### Step 3: Model Conversion & Deployment (1 week)
```bash
# Convert trained model to TensorFlow.js format
tensorflowjs_converter \
  --input_format=keras \
  path/to/model.h5 \
  path/to/tfjs_model/

# Host model files on CDN or serve from your backend
# Update ModelLoader.ts to load custom model
```

#### Step 4: Integration (1 week)
- Update `ModelLoader.ts` to support custom models
- Add model versioning and A/B testing
- Implement fallback to classical CV for low-confidence cases
- Add performance monitoring and accuracy tracking

#### Implementation Files:
- `src/services/ModelLoader.ts` - Add custom model loading
- `src/services/PipClassifier.ts` - New service for pip classification
- `src/services/DominoDetector.ts` - Update to use custom detection model
- `training/` - New directory for training scripts and notebooks

---

### Phase 3: Production Quality (Continuous Improvement)
**Timeline**: Ongoing  
**Expected Accuracy**: 95%+ with continuous improvement  
**Effort**: Low (maintenance)

#### Features:
1. **Hybrid Approach**
   - Use ML model as primary detection method
   - Fall back to classical CV for low-confidence cases
   - Always allow manual correction
   - Track which method was used for analytics

2. **Continuous Learning**
   - Collect corrections from users (with consent)
   - Periodically retrain model with new data
   - A/B test new model versions
   - Roll back if accuracy decreases

3. **Performance Optimization**
   - Use quantized models for faster inference
   - Implement model caching and preloading
   - Use Web Workers for non-blocking detection
   - Add progressive enhancement (show results as they come)

4. **Advanced Features**
   - Multi-domino set support (double-6, double-9, double-12)
   - Colored domino support
   - Partial occlusion handling
   - Real-time detection (process video frames)

---

## Training Resources & Tools

### Data Annotation Tools
- **Roboflow** (https://roboflow.com) - Best for object detection, has free tier
- **LabelImg** (https://github.com/heartexlabs/labelImg) - Free, desktop app
- **CVAT** (https://cvat.org) - Free, web-based, powerful

### Model Training Platforms
- **Google Colab** - Free GPU for training (https://colab.research.google.com)
- **Kaggle Notebooks** - Free GPU/TPU (https://www.kaggle.com/code)
- **Roboflow Train** - Managed training service

### Useful Libraries
- **TensorFlow.js Converter** - Convert models to browser format
- **tfjs-node** - Train models in Node.js with GPU support
- **fast-check** - Already using for property-based testing

### Learning Resources
- TensorFlow.js Transfer Learning: https://www.tensorflow.org/js/tutorials/transfer/what_is_transfer_learning
- YOLO Object Detection: https://pjreddie.com/darknet/yolo/
- Custom Object Detection Guide: https://blog.roboflow.com/train-a-tensorflow-lite-object-detection-model/

---

## Cost Estimates

### Phase 1 (Classical CV)
- **Development**: 40-80 hours
- **Cost**: $0 (no external services needed)

### Phase 2 (ML Model)
- **Data Collection**: Free (using error reporting) or $200-500 (manual annotation services)
- **Training**: Free (Google Colab) or $50-200 (cloud GPU)
- **Model Hosting**: $5-20/month (CDN for model files)
- **Development**: 80-160 hours

### Phase 3 (Production)
- **Monitoring**: $10-50/month (analytics, error tracking)
- **Retraining**: $20-50/quarter (periodic model updates)
- **Maintenance**: 10-20 hours/month

---

## Success Metrics

Track these metrics to measure improvement:

1. **Detection Accuracy**
   - % of dominoes correctly detected (bounding boxes)
   - False positive rate (non-dominoes detected as dominoes)
   - False negative rate (dominoes missed)

2. **Pip Counting Accuracy**
   - % of pip counts that are exactly correct
   - Average error in pip count (off by how many pips)
   - Accuracy by pip count (0-12)

3. **User Experience**
   - % of detections that require manual correction
   - Time to complete a round (including corrections)
   - User satisfaction ratings

4. **Performance**
   - Detection time (target: <2 seconds)
   - Model load time (target: <3 seconds)
   - Memory usage (target: <100MB)

---

## Next Steps

1. **Complete MVP** - Finish remaining tasks (6.5-6.8, 7-16)
2. **Launch & Collect Data** - Get users trying the app, collecting corrections
3. **Analyze Usage** - Identify most common failure modes
4. **Prioritize Improvements** - Start with Phase 1 or Phase 2 based on data
5. **Iterate** - Continuous improvement based on real-world usage

---

## Questions?

See TODO comments in these files for implementation details:
- `src/services/PipCounter.ts` - Pip counting improvements
- `src/services/DominoDetector.ts` - Detection improvements
- `src/services/ModelLoader.ts` - Custom model loading

For help with implementation, refer back to this roadmap and the inline TODO comments.
