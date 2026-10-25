import { createHash } from "node:crypto";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Petition from "../models/Petition.js";
import Poll from "../models/Poll.js";
import User from "../models/User.js";

dotenv.config();

const extraPetitions = [
  {
    title: "Install safer lighting along neighborhood walkways",
    description: "Add reliable lighting along frequently used pedestrian paths and near public transit stops.",
    category: "public-safety",
    location: "Jamshedpur",
    signatureGoal: 100,
  },
  {
    title: "Add more recycling bins to public spaces",
    description: "Place clearly labeled recycling bins in parks, markets, and other busy public areas.",
    category: "environment",
    location: "Ranchi",
    signatureGoal: 120,
  },
  {
    title: "Repair potholes on residential streets",
    description: "Inspect and repair potholes on residential roads and publish a schedule for the work.",
    category: "infrastructure",
    location: "Bengaluru",
    signatureGoal: 150,
  },
  {
    title: "Provide more public drinking-water stations",
    description: "Install and maintain accessible drinking-water stations near parks and community facilities.",
    category: "healthcare",
    location: "Hyderabad",
    signatureGoal: 90,
  },
  {
    title: "Improve bus stop access for wheelchair users",
    description: "Add curb ramps and level boarding areas at bus stops used by residents with mobility needs.",
    category: "transportation",
    location: "Pune",
    signatureGoal: 110,
  },
  {
    title: "Expand after-school programs at public libraries",
    description: "Offer additional homework support and learning activities for students at local libraries.",
    category: "education",
    location: "Mysuru",
    signatureGoal: 80,
  },
  {
    title: "Create a public schedule for park maintenance",
    description: "Publish regular maintenance schedules for playgrounds, sports areas, and public gardens.",
    category: "community",
    location: "Kochi",
    signatureGoal: 100,
  },
  {
    title: "Make local housing assistance easier to access",
    description: "Provide a clear, accessible guide to housing support services and application requirements.",
    category: "housing",
    location: "Chennai",
    signatureGoal: 130,
  },
  {
    title: "Publish clear timelines for permit applications",
    description: "Show residents the steps, expected timelines, and status of common city permit applications.",
    category: "government",
    location: "Delhi",
    signatureGoal: 140,
  },
  {
    title: "Add shaded seating near community health centers",
    description: "Provide shaded, accessible seating for residents waiting near neighborhood health centers.",
    category: "healthcare",
    location: "Jaipur",
    signatureGoal: 95,
  },
];

const extraPolls = [
  {
    title: "Which park improvement should happen first?",
    description: "Help prioritize the next improvements to local parks.",
    targetLocation: "Jamshedpur",
    options: ["More benches", "Playground repairs", "Walking path upgrades"],
    createdByEmail: "admin1@civix.test",
    isOfficial: true,
  },
  {
    title: "How should the city share service updates?",
    description: "Choose the most useful way to receive local service announcements.",
    targetLocation: "Ranchi",
    options: ["Email newsletter", "City website", "Community notice boards"],
    createdByEmail: "citizen01@civix.test",
    isOfficial: false,
  },
  {
    title: "What would improve your daily bus journey?",
    description: "Share which transit improvement would make the biggest difference.",
    targetLocation: "Bengaluru",
    options: ["More frequent buses", "Real-time arrival updates", "Sheltered stops"],
    createdByEmail: "admin1@civix.test",
    isOfficial: true,
  },
  {
    title: "Which community activity would you attend?",
    description: "Help plan activities for an upcoming neighborhood event.",
    targetLocation: "Hyderabad",
    options: ["Outdoor movie", "Community sports", "Gardening workshop"],
    createdByEmail: "citizen02@civix.test",
    isOfficial: false,
  },
  {
    title: "Where should additional recycling bins be placed?",
    description: "Identify locations where additional recycling access is needed.",
    targetLocation: "Pune",
    options: ["Public parks", "Market areas", "Transit stops"],
    createdByEmail: "admin1@civix.test",
    isOfficial: true,
  },
  {
    title: "What is the best time for a neighborhood meeting?",
    description: "Select a time that makes it easier for residents to participate.",
    targetLocation: "Mysuru",
    options: ["Weekday morning", "Weekday evening", "Saturday afternoon"],
    createdByEmail: "citizen03@civix.test",
    isOfficial: false,
  },
  {
    title: "Which library service would you use most?",
    description: "Help local libraries choose their next community service.",
    targetLocation: "Kochi",
    options: ["After-school tutoring", "Weekend workshops", "Digital skills support"],
    createdByEmail: "admin1@civix.test",
    isOfficial: true,
  },
  {
    title: "Which pedestrian safety change is most important?",
    description: "Choose a priority for improving pedestrian safety around town.",
    targetLocation: "Chennai",
    options: ["Better crossing signals", "Lower speed limits", "Wider sidewalks"],
    createdByEmail: "citizen04@civix.test",
    isOfficial: false,
  },
  {
    title: "What would make public spaces more comfortable?",
    description: "Share which amenity would improve your visits to public spaces.",
    targetLocation: "Delhi",
    options: ["More shade", "Drinking-water stations", "Accessible seating"],
    createdByEmail: "admin1@civix.test",
    isOfficial: true,
  },
  {
    title: "Which city information should be easier to find?",
    description: "Help prioritize information to make more accessible to residents.",
    targetLocation: "Jaipur",
    options: ["Road repair schedules", "Permit application status", "Public event calendar"],
    createdByEmail: "citizen05@civix.test",
    isOfficial: false,
  },
];

const stableObjectId = (key) => {
  const hex = createHash("sha256")
    .update(`civix-extra:${key}`)
    .digest("hex")
    .slice(0, 24);
  return new mongoose.Types.ObjectId(hex);
};

async function main() {
  await mongoose.connect(
    process.env.MONGO_URI || "mongodb://localhost:27017/petitionapp"
  );

  const creatorEmails = [
    ...new Set(extraPolls.map((poll) => poll.createdByEmail)),
  ];
  const creators = await User.find({ email: { $in: creatorEmails } }).select(
    "_id email"
  );
  const creatorsByEmail = new Map(
    creators.map((creator) => [creator.email, creator])
  );
  const missingCreators = creatorEmails.filter(
    (email) => !creatorsByEmail.has(email)
  );

  if (missingCreators.length > 0) {
    throw new Error(
      `Seed demo users before adding extra content. Missing: ${missingCreators.join(", ")}`
    );
  }

  for (const [index, data] of extraPetitions.entries()) {
    await Petition.findByIdAndUpdate(
      stableObjectId(`petition-${index + 1}`),
      {
        $set: {
          ...data,
          creator: creatorsByEmail.get("citizen01@civix.test")._id,
          signatures: [],
          status: "active",
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
  }

  for (const [index, data] of extraPolls.entries()) {
    await Poll.findByIdAndUpdate(
      stableObjectId(`poll-${index + 1}`),
      {
        $set: {
          title: data.title,
          description: data.description,
          targetLocation: data.targetLocation,
          createdBy: creatorsByEmail.get(data.createdByEmail)._id,
          isOfficial: data.isOfficial,
          closeDate: new Date(Date.now() + (index + 14) * 86_400_000),
          status: "active",
          options: data.options.map((text) => ({ text, votes: 0 })),
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
  }

  const petitionIds = extraPetitions.map((_, index) =>
    stableObjectId(`petition-${index + 1}`)
  );
  const pollIds = extraPolls.map((_, index) =>
    stableObjectId(`poll-${index + 1}`)
  );
  const [petitionCount, pollCount] = await Promise.all([
    Petition.countDocuments({ _id: { $in: petitionIds } }),
    Poll.countDocuments({ _id: { $in: pollIds } }),
  ]);

  if (petitionCount !== extraPetitions.length || pollCount !== extraPolls.length) {
    throw new Error(
      `Verification failed: found ${petitionCount} petitions and ${pollCount} polls.`
    );
  }

  console.log(
    `Verified extra content: ${petitionCount} petitions and ${pollCount} polls.`
  );
}

main()
  .catch((error) => {
    console.error("Extra content seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
