import hre from "hardhat";

async function main() {
  // @ts-ignore
  const ethers = hre.ethers;
  const ExpenseTracker = await ethers.getContractFactory("ExpenseTracker");
  const expenseTracker = await ExpenseTracker.deploy();

  await expenseTracker.waitForDeployment();

  const address = await expenseTracker.getAddress();
  console.log(`ExpenseTracker deployed to: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
