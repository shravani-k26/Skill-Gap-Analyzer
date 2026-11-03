import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

export const generateAccessToken = (userId: string): string => {
  return jwt.sign(
    { sub: userId },
    JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: "60m",
    }
  );
};
