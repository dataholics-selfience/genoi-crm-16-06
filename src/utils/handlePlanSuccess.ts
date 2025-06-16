import { doc, getDoc, setDoc, collection, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { deleteUser } from "firebase/auth";

type Plan = "jedi" | "mestrejedi" | "mestreyoda";

export const planData: Record<Plan, { name: string; tokens: number }> = {
  jedi: { name: "Jedi", tokens: 1000 },
  mestrejedi: { name: "Mestre Jedi", tokens: 3000 },
  mestreyoda: { name: "Mestre Yoda", tokens: 11000 },
};

export async function handlePlanSuccess(plan: Plan) {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado");

  const planInfo = planData[plan];
  if (!planInfo) throw new Error("Plano inválido");

  // Check if user has already accessed this specific plan's success page
  const planHiredRef = doc(db, 'planHired', user.uid);
  const planHiredDoc = await getDoc(planHiredRef);

  if (planHiredDoc.exists() && planHiredDoc.data().planId === plan) {
    // User is trying to access the same plan's success page again - handle fraud
    const userData = await getDoc(doc(db, 'users', user.uid));
    const transactionId = crypto.randomUUID();
    
    // Create fraud record
    await setDoc(doc(collection(db, 'potentialFraud'), user.uid), {
      uid: user.uid,
      email: user.email,
      planId: plan,
      previousPlan: planHiredDoc.data().planId,
      userData: userData.data(),
      detectedAt: new Date().toISOString(),
      transactionId
    });

    // Record fraud attempt in GDPR compliance
    await setDoc(doc(collection(db, 'gdprCompliance'), transactionId), {
      uid: user.uid,
      email: user.email,
      type: 'fraud_detection',
      detectedAt: new Date().toISOString(),
      planId: plan,
      previousPlan: planHiredDoc.data().planId,
      transactionId
    });

    // Create record in deletedUsers
    await setDoc(doc(db, 'deletedUsers', user.uid), {
      uid: user.uid,
      email: user.email,
      deletedAt: new Date().toISOString(),
      reason: 'potential_fraud',
      transactionId
    });

    // Update user document as disabled
    await updateDoc(doc(db, 'users', user.uid), {
      disabled: true,
      disabledAt: new Date().toISOString(),
      disabledReason: 'potential_fraud'
    });

    // Delete user account
    await deleteUser(user);
    throw new Error('account_deleted');
  }

  const now = new Date();
  const transactionId = crypto.randomUUID();

  // Record plan purchase
  await setDoc(doc(collection(db, 'plans'), transactionId), {
    uid: user.uid,
    email: user.email,
    plan: planInfo.name,
    tokens: planInfo.tokens,
    purchasedAt: now.toISOString(),
    transactionId
  });

  // Update token usage
  await setDoc(doc(db, 'tokenUsage', user.uid), {
    uid: user.uid,
    email: user.email,
    plan: planInfo.name,
    totalTokens: planInfo.tokens,
    usedTokens: 0,
    lastUpdated: now.toISOString(),
    expirationDate: new Date(now.setMonth(now.getMonth() + 1)).toISOString()
  });

  // Record plan hire
  await setDoc(planHiredRef, {
    uid: user.uid,
    email: user.email,
    planId: plan,
    hiredAt: now.toISOString(),
    transactionId
  });

  // Update user's plan
  await updateDoc(doc(db, 'users', user.uid), {
    plan: planInfo.name,
    updatedAt: now.toISOString()
  });

  // Record in GDPR compliance
  await setDoc(doc(collection(db, 'gdprCompliance'), transactionId), {
    uid: user.uid,
    email: user.email,
    type: 'plan_purchase',
    plan: planInfo.name,
    purchasedAt: now.toISOString(),
    transactionId
  });

  return planInfo;
}