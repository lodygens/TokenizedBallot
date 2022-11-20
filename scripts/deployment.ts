import { MyToken, MyToken__factory } from "../typechain-types";
import { TokenizedBallot, TokenizedBallot__factory } from "../typechain-types";
import { ethers } from "hardhat";
import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import

dotenv.config()

/**
 * Some constants
 */
 const CMD_DEPLOY = "deploy";
 const CMD_GIVERIGHTTOVOTE = "giveRightToVote";
 const CMD_DELEGATEVOTE = "delegate";
 const CMD_VOTE = "vote";
 const CMD_WINNER = "winner";
 const CMD_PROPOSALS = "proposals";
 const BLOCK_NUMBER = 10;
 const TEST_MINT_VALUE = ethers.utils.parseEther("10");


/**
 * This is note used; this is the example during the session with Matheus
 * This is kept here as reference
 */
async function session() {
  /*
      const provider = new ethers.providers.InfuraProvider("goerli", process.env.INFURA_API_KEY);
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY ?? "");
      const signer = wallet.connect(provider);
      const accounts = await ethers.getSigners();
      const contractFactory = new MyToken__factory(signer);
      const contract = await contractFactory.deploy() as MyToken;
      await contract.deployed();
      console.log(`Contract deployed at ${contract.address}`)
  */

  const accounts = await ethers.getSigners();
  const [minter, voter, other] = accounts;
  const contractFactory = new MyToken__factory(minter);
  const contract = await contractFactory.deploy() as MyToken;
  await contract.deployed();
  console.log(`Contract deployed at ${contract.address}`);

  let voterTokenBalance = await contract.balanceOf(voter.address);
  console.log(`Before mint voterTokenBalance = ${voterTokenBalance}`);

  const mintTx = await contract.mint(voter.address, TEST_MINT_VALUE);
  await mintTx.wait();
  voterTokenBalance = await contract.balanceOf(voter.address);
  console.log(`After mint voterTokenBalance = ${voterTokenBalance}`);

  let votePower = await contract.getVotes(voter.address);
  console.log(`After mint votePower = ${votePower}`);

  let delegateTx = await contract.connect(voter).delegate(voter.address);
  await delegateTx.wait();
  votePower = await contract.getVotes(voter.address);
  console.log(`After delegating votePower = ${votePower}`);

  const transferTx = await contract.connect(voter).transfer(other.address, TEST_MINT_VALUE.div(2));
  await transferTx.wait();
  votePower = await contract.getVotes(voter.address);
  console.log(`After transfer votePower = ${votePower}`);

  votePower = await contract.getVotes(other.address);
  console.log(`After transfer other votePower = ${votePower}`);
  delegateTx = await contract.connect(other).delegate(other.address);

  await delegateTx.wait();
  votePower = await contract.getVotes(other.address);
  console.log(`After transfer and delegate other votePower = ${votePower}`);

  const currentBlock = await ethers.provider.getBlock("latest");
  for (let blockNumber = currentBlock.number - 1; blockNumber > 0; blockNumber--) {
    const pastVotePower = await contract.getPastVotes(voter.address, blockNumber);
    console.log(`At block ${blockNumber} votePower was = ${pastVotePower}`);
  }
}


/**
 * This is the main function.
 * This parses command line and call the according functions as follow
 *   $0 deploy : this deploys
 *           to deploy Token Smart Contact and TokenizedBallot Smart Contact
 *   $0 proposals contractAddr  : this shows proposals
 *           contractAddr is the tokenizedBallotSmartContractAddress
 *   $0 giveRightToVote contractAddr voterWallet : 
 *           contractAddr is the tokenContractAddress
 *           voterWallet is the wallet to give right to vote to
 *   $0 delegate contractAddr delegatedWallet : this delegate vote
 *           contractAddr is the tokenContractAddress
 *           delegatedWallet is the wallet to delegate vote to
 *   $0 vote contractAddr proposal : this votes
 *           contractAddr is the tokenizedBallotSmartContractAddress
 *           proposal is the vote itself
 *   $0 proposals contractAddr : this shows all proposals
 *           contractAddr is the tokenizedBallotSmartContractAddress
 *   $0 winner contractAddr : this shows the winner
 *           contractAddr is the tokenizedBallotSmartContractAddress
 */
async function main() {
  const args = process.argv;

  if (args.length < 3) {
    console.error("[MAIN][ERROR] : not enough arguments")
    process.exit(1);
  }

  const commandLineCmd = args[2];

  if (commandLineCmd.localeCompare(CMD_DEPLOY) == 0) {
    deploy(args.slice(3));
  }
  else if (commandLineCmd.localeCompare(CMD_GIVERIGHTTOVOTE) == 0) {
    giveRightToVote(args[3], args[4]);
  }
  else if (commandLineCmd.localeCompare(CMD_DELEGATEVOTE) == 0) {
    delegate(args[3], args[4]);
  }
  else if (commandLineCmd.localeCompare(CMD_VOTE) == 0) {
    vote(args[3], args[4]);
  }
  else if (commandLineCmd.localeCompare(CMD_PROPOSALS) == 0) {
    proposals(args[3]);
  }
  else if (commandLineCmd.localeCompare(CMD_WINNER) == 0) {
    winner(args[3]);
  }
}

/**
 * This converts a string array to a byte32 array
 * @param array 
 * @returns a bytes32 array
 */
function convertStringArrayToBytes32(array: string[]) {
  const bytes32Array = [];
  for (let index = 0; index < array.length; index++) {
    bytes32Array.push(ethers.utils.formatBytes32String(array[index]));
  }
  return bytes32Array;
}

/**
 * This deploys the MyToken and Tokenized smart contracts
 * @param proposals is an array of string containing the proposals from command line
 */
async function deploy(proposals: string[]) {

  const provider = new ethers.providers.InfuraProvider("goerli", process.env.INFURA_API_KEY);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY ?? "");
  const signer = wallet.connect(provider);
  const balance = await signer.getBalance();

  if (proposals.length <= 0) throw new Error("Deploy : not enough args");

  console.log(`[DEPLOY] : connected to address ${signer.address} with balance ${balance.toString()}`);

  let accounts = await ethers.getSigners();
  const tokenFactory = new MyToken__factory(signer);
  const tokenContract = await tokenFactory.deploy() as MyToken;
  await tokenContract.deployed();
  console.log(`[DEPLOY] : MyToken deployed at ${tokenContract.address}`);

  const tokenizedBallotFactory = new TokenizedBallot__factory(signer);
  const tokenizedBallotContrat = await tokenizedBallotFactory.deploy(
    convertStringArrayToBytes32(proposals),
    tokenContract.address,
    BLOCK_NUMBER
  ) as TokenizedBallot;

  await tokenizedBallotContrat.deployed();
  console.log(`[DEPLOY] : TokenizedBallot deployed at ${tokenizedBallotContrat.address}`);

}

/**
 * This dumps all proposals
 * @param contractAddress is the address of the Tokenized Smartcontract
 */
async function proposals(contractAddress: string) {

  const provider = new ethers.providers.InfuraProvider("goerli", process.env.INFURA_API_KEY);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY ?? "");
  const signer = wallet.connect(provider);

  console.log("[PROPOSALS] : tokenizedBallot.attach(" + contractAddress + ")");

  const ballotFactory = new TokenizedBallot__factory(signer);
  let ballotContract = ballotFactory.attach(contractAddress);

  for (let i = 0; i < 100; i++) {
    try {
      const proposal = await ballotContract.proposals(i);
      console.log("    proposal[" + i + "] = { \"" + ethers.utils.parseBytes32String(proposal.name) + "\", " + proposal.voteCount + "}");
    } catch (e) {
      i = 100;
    }
  }
}

/**
 * This mints voting token
 * Command line arguments must be as follow
 * @param tokenContractAddress is the address of the token smartcontract
 * @param voterWallet is the voter wallet
 */
async function giveRightToVote(tokenContractAddress: string, voterWallet : string) {

  const provider = new ethers.providers.InfuraProvider("goerli", process.env.INFURA_API_KEY);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY ?? "");
  const signer = wallet.connect(provider);

  console.log("[GIVERIGHTTOVOTE] : token.attach(" + tokenContractAddress + ")");
  const tokenFactory = new MyToken__factory(signer);
  let tokenContract = tokenFactory.attach(tokenContractAddress);

  const mintTx = await tokenContract.mint(voterWallet, TEST_MINT_VALUE);
  const mintReceipt = await mintTx.wait();

  const voterTokenBalance = await tokenContract.balanceOf(voterWallet);
  console.log(`[GIVERIGHTTOVOTE] : voterTokenBalance = ${voterTokenBalance}`);

  const votePower = await tokenContract.getVotes(voterWallet);
  console.log(`[GIVERIGHTTOVOTE] : votePower = ${votePower}`);

  console.log("[GIVERIGHTTOVOTE] : Mint Tx hash " + mintReceipt.transactionHash);
}

/**
 * This delegates vote power
 * @param tokenContractAddress is the address of the token smartcontract
 * @param voterWallet is the voter wallet to delegate to
 */
async function delegate(tokenContractAddress: string, voterWallet : string) {

  const provider = new ethers.providers.InfuraProvider("goerli", process.env.INFURA_API_KEY);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY ?? "");
  const signer = wallet.connect(provider);

  console.log("[DELEGATE] : tokenizedBallot.attach(" + tokenContractAddress + ")");
  console.log("[DELEGATE] : delegating to " + voterWallet);

  const tokenFactory = new MyToken__factory(signer);
  let tokenContract = tokenFactory.attach(tokenContractAddress);
  let delegateTx = await tokenContract.connect(signer).delegate(voterWallet);

  const delegateReceipt = await delegateTx.wait();
  const voterTokenBalance = await tokenContract.balanceOf(voterWallet);
  console.log(`[DELEGATE] : delegated voterTokenBalance = ${voterTokenBalance}`);

  const votePower = await tokenContract.getVotes(voterWallet);
  console.log(`[DELEGATE] : delegated votePower = ${votePower}`);

  console.log("[DELEGATE] : Delegate Tx hash " + delegateReceipt.transactionHash);
}


/**
 * This calls Ballot.vote
 * @param tokenizedBallotContractAddress is the address of the tokenied ballot smartcontract
 * @param proposal is the vote itself
 */
async function vote(tokenizedBallotContractAddress: string, proposal : string) {

  const provider = new ethers.providers.InfuraProvider("goerli", process.env.INFURA_API_KEY);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY ?? "");
  const signer = wallet.connect(provider);

  console.log("[VOTE] ballot.attach(" + tokenizedBallotContractAddress + ")");
  console.log("[VOTE] ballot.vote(" + proposal + ")");

  const ballotFactory = new TokenizedBallot__factory(signer);
  let ballotContract = await ballotFactory.attach(tokenizedBallotContractAddress);
  const tx = await ballotContract.vote(proposal, 5);
  const receipt = await tx.wait();

  console.log("Vote Tx hash " + receipt.transactionHash);
}
/**
 * This calls Ballot.winnerName()
 * @param tokenizedBallotContractAddress is the address of the tokenied ballot smartcontract
 */
async function winner(tokenizedBallotContractAddress: string) {

  const provider = new ethers.providers.InfuraProvider("goerli", process.env.INFURA_API_KEY);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY ?? "");
  const signer = wallet.connect(provider);

  console.log("ballot.attach(" + tokenizedBallotContractAddress + ")");
  console.log("ballot.winnerName()");

  const ballotFactory = new TokenizedBallot__factory(signer);
  let ballotContract = ballotFactory.attach(tokenizedBallotContractAddress);
  const winner = await ballotContract.winnerName();

  console.log("Winner name  = " + ethers.utils.parseBytes32String(winner));
}


/**
 * let call main()
 */
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
