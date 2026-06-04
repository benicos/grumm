#!/usr/bin/env node

// Test script to verify tone color handling fixes

const DEFAULT_TONE = "linear-gradient(135deg, #0b1424, #132744, #f0a95a)";

// Test extractToneStops with new CSS format
function extractToneStops(tone?: string | null) {
  if (!tone) {
    return {
      gradient_end: "#f0a95a",
      gradient_middle: "#132744",
      gradient_start: "#0b1424",
    };
  }

  const trimmed = tone.trim();

  // Handle CSS linear-gradient format
  if (trimmed.startsWith("linear-gradient(")) {
    const colors = [...trimmed.matchAll(/#[0-9a-fA-F]{3,8}/g)]
      .map((match) => match[0])
      .filter(Boolean);

    return {
      gradient_start: colors[0] ?? "#0b1424",
      gradient_middle: colors[1] ?? "#132744",
      gradient_end: colors[2] ?? "#f0a95a",
    };
  }

  // Handle Tailwind format
  const colors = [...trimmed.matchAll(/\[(#[0-9a-fA-F]{3,8})\]/g)]
    .map((match) => match[1])
    .filter(Boolean);

  return {
    gradient_end: colors[2] ?? colors[1] ?? "#f0a95a",
    gradient_middle: colors[1] ?? colors[0] ?? "#132744",
    gradient_start: colors[0] ?? "#0b1424",
  };
}

// Test toneFromStops with new CSS format
function toneFromStops(form: {
  gradient_start: string;
  gradient_middle: string;
  gradient_end: string;
}) {
  return `linear-gradient(135deg, ${form.gradient_start}, ${form.gradient_middle}, ${form.gradient_end})`;
}

console.log("=== Testing Tone Color Fix ===\n");

// Test 1: All white colors (the user's scenario)
console.log("Test 1: All white colors");
const whiteForm = {
  gradient_start: "#ffffff",
  gradient_middle: "#ffffff",
  gradient_end: "#ffffff",
};
const whiteTone = toneFromStops(whiteForm);
console.log("Generated tone:", whiteTone);
console.log("Contains #831843?", whiteTone.includes("#831843") ? "❌ FAIL" : "✓ PASS");
console.log();

// Test 2: Cinema culture old tone (Tailwind format)
console.log("Test 2: Extract cinema-culture tone (old Tailwind format)");
const cinemaTone = "from-[#1f1020] via-[#831843] to-[#f472b6]";
const cinemaStops = extractToneStops(cinemaTone);
console.log("Extracted colors:", cinemaStops);
console.log("Extracted via color:", cinemaStops.gradient_middle);
console.log("Extracted correctly?", cinemaStops.gradient_middle === "#831843" ? "✓ PASS" : "❌ FAIL");
console.log();

// Test 3: Parse new CSS format
console.log("Test 3: Parse new CSS format");
const newCinemaForm = {
  gradient_start: "#1f1020",
  gradient_middle: "#cccccc", // User changed this
  gradient_end: "#f472b6",
};
const newCinemaTone = toneFromStops(newCinemaForm);
console.log("Generated tone:", newCinemaTone);
console.log("Contains old #831843?", newCinemaTone.includes("#831843") ? "❌ FAIL" : "✓ PASS");
console.log("Contains new #cccccc?", newCinemaTone.includes("#cccccc") ? "✓ PASS" : "❌ FAIL");
console.log();

// Test 4: Extract new CSS format
console.log("Test 4: Extract new CSS format");
const extractedNewCinema = extractToneStops(newCinemaTone);
console.log("Extracted colors:", extractedNewCinema);
console.log("Matches original?",
  extractedNewCinema.gradient_start === "#1f1020" &&
  extractedNewCinema.gradient_middle === "#cccccc" &&
  extractedNewCinema.gradient_end === "#f472b6" ? "✓ PASS" : "❌ FAIL");
console.log();

// Test 5: Default tone format
console.log("Test 5: Default tone format");
console.log("DEFAULT_TONE:", DEFAULT_TONE);
const defaultStops = extractToneStops(DEFAULT_TONE);
console.log("Extracted colors:", defaultStops);
console.log("Correct defaults?",
  defaultStops.gradient_start === "#0b1424" &&
  defaultStops.gradient_middle === "#132744" &&
  defaultStops.gradient_end === "#f0a95a" ? "✓ PASS" : "❌ FAIL");
console.log();

// Test 6: Empty tone (uses defaults)
console.log("Test 6: Empty/null tone");
const emptyStops = extractToneStops(null);
console.log("Extracted colors:", emptyStops);
console.log("Uses defaults?",
  emptyStops.gradient_start === "#0b1424" &&
  emptyStops.gradient_middle === "#132744" &&
  emptyStops.gradient_end === "#f0a95a" ? "✓ PASS" : "❌ FAIL");
console.log();

console.log("=== All Tests Completed ===");
