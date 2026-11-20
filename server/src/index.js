
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dns from 'node:dns';
import 'dotenv/config';

import { analyzeRules, validatePayload } from './reasoner.js';

// Use public DNS resolvers for MongoDB Atlas SRV lookups.
// This may help when the system DNS resolver refuses SRV queries.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const app = express();

app.disable('x-powered-by');

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173'
}));

app.use(express.json({ limit: '40kb' }));

// MongoDB schema
const analysisSchema = new mongoose.Schema({
  condition: {
    type: String,
    required: true
  },
  expert1: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  expert2: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  caseFacts: [String],
  result: mongoose.Schema.Types.Mixed,
  review: {
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'needs-more-evidence'],
      default: 'pending'
    },
    notes: {
      type: String,
      default: ''
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  versionKey: false
});

const Analysis = mongoose.model('Analysis', analysisSchema);

const connected = () => mongoose.connection.readyState === 1;

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    database: connected() ? 'connected' : 'disconnected',
    engine: 'deterministic'
  });
});

// Analyze expert rules
app.post('/api/analyze', async (req, res) => {
  const error = validatePayload(req.body);

  if (error) {
    return res.status(400).json({ error });
  }

  const input = {
    condition: req.body.condition.trim(),
    expert1: req.body.expert1,
    expert2: req.body.expert2,
    caseFacts: req.body.caseFacts || []
  };

  const result = analyzeRules(input);

  let saved = false;
  let id = null;
  let saveError = null;

  if (connected()) {
    try {
      const doc = await Analysis.create({
        ...input,
        result
      });

      saved = true;
      id = doc.id;
    } catch (e) {
      console.error('Save failed:', e.message);
      saveError = 'Database save failed';
    }
  }

  res.json({
    result,
    saved,
    id,
    saveError
  });
});

// Get analysis history
app.get('/api/history', async (_req, res) => {
  if (!connected()) {
    return res.json({
      database: 'disconnected',
      items: []
    });
  }

  try {
    const items = await Analysis.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      database: 'connected',
      items
    });
  } catch {
    res.status(500).json({
      error: 'History unavailable'
    });
  }
});

// Update review
app.patch('/api/history/:id/review', async (req, res) => {
  if (!connected()) {
    return res.status(503).json({
      error: 'Connect MongoDB to save reviews.'
    });
  }

  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({
      error: 'Invalid record ID.'
    });
  }

  const { status, notes } = req.body || {};

  if (
    !['pending', 'reviewed', 'needs-more-evidence'].includes(status) ||
    typeof notes !== 'string' ||
    notes.length > 1000
  ) {
    return res.status(400).json({
      error: 'Invalid review status or notes.'
    });
  }

  try {
    const doc = await Analysis.findByIdAndUpdate(
      req.params.id,
      { $set: { review: { status, notes } } },
      { new: true }
    );

    if (!doc) {
      return res.status(404).json({
        error: 'Not found'
      });
    }

    res.json({
      ok: true,
      review: doc.review
    });
  } catch {
    res.status(500).json({
      error: 'Unable to update review'
    });
  }
});

// Error handler
app.use((err, _req, res, _next) => {
  res.status(400).json({
    error: err.type === 'entity.too.large'
      ? 'Request too large'
      : 'Invalid request JSON'
  });
});

// Start backend
const port = Number(process.env.PORT) || 5000;

app.listen(port, () => {
  console.log(`MedRule API running at http://localhost:${port}`);
});

// MongoDB Atlas connection
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000
  })
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch((e) => {
    console.warn('MongoDB connection failed:', e.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });
} else {
  console.warn(
    'MONGODB_URI not set: analysis works but history is not saved.'
  );
}
