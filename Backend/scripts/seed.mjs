import { createHash } from "node:crypto";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Petition from "../models/Petition.js";
import Poll from "../models/Poll.js";
import User from "../models/User.js";
import Vote from "../models/Vote.js";

dotenv.config();

const demoPassword = "CivixDemo2026!";

const citizens = [
  "Aarav Sharma", "Aditi Verma", "Arjun Patel", "Ananya Reddy", "Dev Mehta",
  "Diya Nair", "Ishaan Gupta", "Isha Rao", "Kabir Singh", "Kavya Iyer",
  "Krish Malhotra", "Meera Joshi", "Nikhil Das", "Neha Kapoor", "Pranav Shah",
  "Riya Menon", "Rohan Kulkarni", "Sara Thomas", "Vivaan Bhat", "Zoya Khan",
  "Advik Sinha", "Anika Bose", "Dhruv Jain", "Myra Chawla", "Reyansh Pillai",
].map((fullName, index) => ({
  fullName,
  email: `citizen${String(index + 1).padStart(2, "0")}@civix.test`,
  role: "citizen",
}));

const officials = [
  { fullName: "Civix Admin One", email: "admin1@civix.test", role: "official" },
  { fullName: "Civix Admin Two", email: "admin2@civix.test", role: "official" },
];

const petitionData = [
  {
    title: "Safer crossings near neighborhood schools",
    description: "Request marked crossings, slower speed limits, and visible signage near local schools.",
    category: "public-safety",
    location: "Jamshedpur",
    signatureGoal: 100,
    status: "active",
  },
  {
    title: "More frequent waste collection in residential areas",
    description: "Ask the city to publish a reliable collection schedule and add bins at busy community locations.",
    category: "environment",
    location: "Ranchi",
    signatureGoal: 150,
    status: "under-review",
  },
  {
    title: "Repair sidewalks along the central bus route",
    description: "Improve damaged sidewalks and curb ramps so the route is safer for pedestrians and wheelchair users.",
    category: "infrastructure",
    location: "Bengaluru",
    signatureGoal: 120,
    status: "active",
  },
  {
    title: "Extend evening public library hours",
    description: "Keep selected public libraries open later on weekdays for students and working residents.",
    category: "education",
    location: "Hyderabad",
    signatureGoal: 80,
    status: "approved",
  },
  {
    title: "Add shaded seating at community bus stops",
    description: "Install accessible seating and shade at high-use bus stops across the district.",
    category: "transportation",
    location: "Pune",
    signatureGoal: 100,
    status: "active",
  },
  {
    title: "Create a public maintenance tracker",
    description: "Provide residents with a simple way to follow the status of submitted civic maintenance requests.",
    category: "government",
    location: "Mysuru",
    signatureGoal: 90,
    status: "under-consideration",
  },
  {
    title: "Expand weekend access to neighborhood clinics",
    description: "Pilot weekend clinic hours in areas where weekday appointments are difficult to attend.",
    category: "healthcare",
    location: "Kochi",
    signatureGoal: 110,
    status: "active",
  },
  {
    title: "Improve lighting in public parks",
    description: "Repair existing lights and add efficient fixtures to well-used paths and park entrances.",
    category: "community",
    location: "Chennai",
    signatureGoal: 130,
    status: "active",
  },
  {
    title: "Add accessible ramps to neighborhood sidewalks",
    description: "Install and repair curb ramps near public buildings and well-used pedestrian crossings.",
    category: "infrastructure",
    location: "Mangaluru",
    signatureGoal: 95,
    status: "active",
  },
  {
    title: "Publish air-quality readings for local neighborhoods",
    description: "Make neighborhood air-quality readings and health guidance easy for residents to find.",
    category: "environment",
    location: "Delhi",
    signatureGoal: 140,
    status: "under-review",
  },
  {
    title: "Create more shaded spaces at public playgrounds",
    description: "Add shade and drinking-water access so families can safely use playgrounds during warmer months.",
    category: "community",
    location: "Jaipur",
    signatureGoal: 75,
    status: "active",
  },
  {
    title: "Improve pedestrian access around the community hospital",
    description: "Repair walkways and improve crossing signs near the hospital entrance and nearby bus stops.",
    category: "healthcare",
    location: "Visakhapatnam",
    signatureGoal: 115,
    status: "active",
  },
  {
    title: "Share clear timelines for neighborhood road repairs",
    description: "Publish project schedules and detour notices for planned road maintenance in residential areas.",
    category: "transportation",
    location: "Coimbatore",
    signatureGoal: 105,
    status: "under-consideration",
  },
];

const pollData = [
  {
    title: "Which neighborhood improvement should be prioritized?",
    description: "Help the city identify the most useful project for the next community improvement cycle.",
    targetLocation: "Jamshedpur",
    options: ["Safer crossings", "Better sidewalks", "Park improvements"],
    createdByEmail: officials[0].email,
    isOfficial: true,
    voterCount: 18,
  },
  {
    title: "What is the best time for a public community meeting?",
    description: "Choose a time that makes it easier for residents to attend.",
    targetLocation: "Ranchi",
    options: ["Weekday morning", "Weekday evening", "Saturday"],
    createdByEmail: officials[0].email,
    isOfficial: true,
    voterCount: 11,
  },
  {
    title: "Which city service update would be most helpful?",
    description: "Select the information you would most like to find on the city website.",
    targetLocation: "Bengaluru",
    options: ["Waste collection schedule", "Road work updates", "Public transport notices"],
    createdByEmail: officials[0].email,
    isOfficial: true,
    voterCount: 23,
  },
  {
    title: "Where should additional public seating be considered?",
    description: "Share which type of public location would benefit most from more seating.",
    targetLocation: "Hyderabad",
    options: ["Bus stops", "Parks", "Public service centers"],
    createdByEmail: officials[0].email,
    isOfficial: true,
    voterCount: 15,
  },
  {
    title: "Which format works best for local service announcements?",
    description: "Help the communications team choose how to share important updates.",
    targetLocation: "Pune",
    options: ["Email updates", "City website", "Community notice boards"],
    createdByEmail: officials[0].email,
    isOfficial: true,
    voterCount: 8,
  },
  {
    title: "Which local park activity would you join?",
    description: "Help neighbors choose an activity for an upcoming community park day.",
    targetLocation: "Mysuru",
    options: ["Community gardening", "Outdoor games", "Nature walk"],
    createdByEmail: citizens[2].email,
    isOfficial: false,
    voterCount: 14,
  },
  {
    title: "What should our neighborhood clean-up focus on?",
    description: "Choose the area residents should prioritize at the next volunteer clean-up.",
    targetLocation: "Kochi",
    options: ["Street litter", "Park paths", "Canal or lake edges"],
    createdByEmail: citizens[5].email,
    isOfficial: false,
    voterCount: 7,
  },
  {
    title: "How would you prefer to receive neighborhood updates?",
    description: "Let the community know which channel would be most useful for local news.",
    targetLocation: "Chennai",
    options: ["Messaging group", "Email newsletter", "Community notice board"],
    createdByEmail: citizens[8].email,
    isOfficial: false,
    voterCount: 20,
  },
  {
    title: "What would make the local market easier to visit?",
    description: "Share which improvement would help residents when visiting the neighborhood market.",
    targetLocation: "Pune",
    options: ["More bicycle parking", "Clearer signs", "More pedestrian space"],
    createdByEmail: citizens[11].email,
    isOfficial: false,
    voterCount: 10,
  },
  {
    title: "Which service should a community help desk offer first?",
    description: "Help volunteers decide what kind of assistance to offer at a neighborhood help desk.",
    targetLocation: "Hyderabad",
    options: ["Finding civic services", "Filing maintenance requests", "Finding community events"],
    createdByEmail: citizens[14].email,
    isOfficial: false,
    voterCount: 22,
  },
  {
    title: "Where should the next resident meet-up take place?",
    description: "Choose an accessible location for residents to meet and discuss neighborhood ideas.",
    targetLocation: "Bengaluru",
    options: ["Public library", "Community hall", "Neighborhood park"],
    createdByEmail: citizens[18].email,
    isOfficial: false,
    voterCount: 5,
  },
];

const signatureCounts = [10, 14, 7, 19, 5, 12, 22, 8, 16, 6, 20, 11, 4];

function stableObjectId(key) {
  const hex = createHash("sha256").update(`civix-demo:${key}`).digest("hex").slice(0, 24);
  return new mongoose.Types.ObjectId(hex);
}

async function seedUsers() {
  const usersByEmail = new Map();

  for (const userData of [...citizens, ...officials]) {
    let user = await User.findOne({ email: userData.email });
    if (!user) {
      user = new User(userData);
    } else {
      user.set(userData);
    }

    user.password = demoPassword;
    user.isVerified = true;
    await user.save();
    usersByEmail.set(userData.email, user);
  }

  return usersByEmail;
}

async function seedPetitions(usersByEmail) {
  let signatureCount = 0;

  for (const [petitionIndex, data] of petitionData.entries()) {
    const creatorIndex = petitionIndex % citizens.length;
    const creator = usersByEmail.get(citizens[creatorIndex].email);
    const signatureIndexes = Array.from({ length: citizens.length }, (_, index) =>
      (petitionIndex * 3 + index + 1) % citizens.length
    )
      .filter((index) => index !== creatorIndex)
      .slice(0, signatureCounts[petitionIndex]);
    const signatures = signatureIndexes.map((userIndex, index) => ({
      user: usersByEmail.get(citizens[userIndex].email)._id,
      signedAt: new Date(Date.now() - (index + petitionIndex + 1) * 86_400_000),
    }));

    await Petition.findByIdAndUpdate(
      stableObjectId(`petition-${petitionIndex + 1}`),
      {
        $set: {
          ...data,
          creator: creator._id,
          signatures,
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    signatureCount += signatures.length;
  }

  return signatureCount;
}

async function seedPolls(usersByEmail) {
  const now = Date.now();
  let voteCount = 0;

  for (const [pollIndex, data] of pollData.entries()) {
    const pollId = stableObjectId(`poll-${pollIndex + 1}`);
    const creator = usersByEmail.get(data.createdByEmail);
    await Vote.deleteMany({ pollId });
    const voterIndexes = Array.from({ length: citizens.length }, (_, index) =>
      (pollIndex * 7 + index * 3) % citizens.length
    ).slice(0, data.voterCount);
    const selectedOptions = voterIndexes.map((userIndex, voteIndex) => ({
      userId: usersByEmail.get(citizens[userIndex].email)._id,
      selectedOption: data.options[(voteIndex + pollIndex) % data.options.length],
    }));
    const voteCounts = new Map(data.options.map((option) => [option, 0]));

    for (const vote of selectedOptions) {
      voteCounts.set(vote.selectedOption, voteCounts.get(vote.selectedOption) + 1);
      await Vote.updateOne(
        { pollId, userId: vote.userId },
        { $set: { selectedOption: vote.selectedOption, votedAt: new Date(now - (pollIndex + 1) * 3_600_000) } },
        { upsert: true, runValidators: true }
      );
      voteCount += 1;
    }

    await Poll.findByIdAndUpdate(
      pollId,
      {
        $set: {
          title: data.title,
          description: data.description,
          targetLocation: data.targetLocation,
          createdBy: creator._id,
          isOfficial: data.isOfficial,
          closeDate: new Date(now + (pollIndex + 7) * 86_400_000),
          status: "active",
          options: data.options.map((text) => ({ text, votes: voteCounts.get(text) })),
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
  }

  return voteCount;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/petitionapp");
  const usersByEmail = await seedUsers();
  const signatureCount = await seedPetitions(usersByEmail);
  const voteCount = await seedPolls(usersByEmail);

  console.log(
    `Seed complete: ${citizens.length} citizens, ${officials.length} officials, ` +
    `${petitionData.length} petitions, ${signatureCount} signatures, ` +
    `${pollData.length} polls, ${voteCount} votes.`
  );
}

main()
  .catch((error) => {
    console.error("Database seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
