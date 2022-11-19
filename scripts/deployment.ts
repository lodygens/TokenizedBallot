import { MyToken, MyToken__factory } from "../typechain-types";
import { TokenizedBallot, TokenizedBallot__factory } from "../typechain-types";
import { ethers } from "hardhat";
import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import

dotenv.config()
const TEST_MINT_VALUE = ethers.utils.parseEther("10");

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

const CMD_DEPLOY = "deploy";
const CMD_GIVERIGHTTOVOTE = "giveRightToVote";
const CMD_DELEGATEVOTE = "delegate";
const CMD_VOTE = "vote";
const CMD_WINNER = "winner";
const CMD_PROPOSALS = "proposals";

/**
 * This is the main function.
 * This parses command line and call the according functions as follow
 *   $0 deploy : this deploys
 *           to deploy Token Smart Contact
 *           to deploy TokenizedBallot Smart Contact
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
  // console.log(args);
  const commandLineCmd = args[2];
  //console.log(commandLineCmd);
  if (commandLineCmd.localeCompare(CMD_DEPLOY) == 0) {
    deploy();
  }
  else if (commandLineCmd.localeCompare(CMD_GIVERIGHTTOVOTE) == 0) {
    giveRightToVote();
  }
  else if (commandLineCmd.localeCompare(CMD_DELEGATEVOTE) == 0) {
    delegate();
  }
  else if (commandLineCmd.localeCompare(CMD_VOTE) == 0) {
    vote();
  }
  else if (commandLineCmd.localeCompare(CMD_PROPOSALS) == 0) {
    proposals();
  }
  else if (commandLineCmd.localeCompare(CMD_WINNER) == 0) {
    winner();
  }
}

/**
 * This converts a string to a byte32 array
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
 * This deploy the MyToken Smart Contract
 */
async function deploy() {
  const provider = new ethers.providers.InfuraProvider("goerli", process.env.INFURA_API_KEY);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY ?? "");
  const signer = wallet.connect(provider);
  const balance = await signer.getBalance();

  const args = process.argv;
  const proposals = args.slice(3);

  if (proposals.length <= 0) throw new Error("Deploy : not enough args");

  console.log(`[DEPLOY] : connected to address ${signer.address} with balance ${balance.toString()}`);

  let accounts = await ethers.getSigners();
  const tokenFactory = new MyToken__factory(signer);
  const tokenContract = await tokenFactory.deploy() as MyToken;
  await tokenContract.deployed();
  console.log(`[DEPLOY] : MyToken deployed at ${tokenContract.address}`);

  const tokenizedBallotFactory = new TokenizedBallot__factory(signer);
  const tokenizedBallotContrat = await tokenizedBallotFactory.deploy(proposals, tokenContract.address, 10) as TokenizedBallot;
  await tokenizedBallotContrat.deployed();
  console.log(`[DEPLOY] : TokenizedBallot deployed at ${tokenizedBallotContrat.address}`);

}

/**
 * This calls Ballot.proposals()
 * Command line arguments must be as follow
 *   - args[3] contains tokenizedBallotSmartContractAddress
 */
async function proposals() {
  const provider = new ethers.providers.InfuraProvider("goerli", process.env.INFURA_API_KEY);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY ?? "");
  const signer = wallet.connect(provider);

  const args = process.argv;
  const contractAddress = args[3];

  console.log("[PROPOSALS] : tokenizedBallot.attach(" + contractAddress + ")");

  const ballotFactory = new TokenizedBallot__factory(signer);
  let ballotContract = ballotFactory.attach(contractAddress);

  for (let i = 0; i < 100; i++) {
    try {
      const proposal = await ballotContract.proposals(i);
      console.log("proposal[" + i + "] = { \"" + ethers.utils.parseBytes32String(proposal.name) + "\", " + proposal.voteCount + "}");
    } catch (e) {
      i = 100;
    }
  }
}

/**
 * This calls Ballot.giveRightToVote
 * Command line arguments must be as follow
 *   - args[3] contains tokenContractAddress
 *   - args[4] contains voterWallet
 */
async function giveRightToVote() {
  const provider = new ethers.providers.InfuraProvider("goerli", process.env.INFURA_API_KEY);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY ?? "");
  const signer = wallet.connect(provider);

  const args = process.argv;
  const contractAddress = args[3];
  const voterWallet = args[4];

  console.log("[GIVERIGHTTOVOTE] : tokenizedBallot.attach(" + contractAddress + ")");
  const tokenFactory = new MyToken__factory(signer);
  let tokenContract = tokenFactory.attach(contractAddress);

  const mintTx = await tokenContract.mint(voterWallet, TEST_MINT_VALUE);
  const mintReceipt = await mintTx.wait();

  const voterTokenBalance = await tokenContract.balanceOf(voterWallet);
  console.log(`[GIVERIGHTTOVOTE] : voterTokenBalance = ${voterTokenBalance}`);

  const votePower = await tokenContract.getVotes(voterWallet);
  console.log(`[GIVERIGHTTOVOTE] : votePower = ${votePower}`);

  console.log("[GIVERIGHTTOVOTE] : Mint Tx hash " + mintReceipt.transactionHash);
}

/**
 * This calls Ballot.giveRightToVote
 * Command line arguments must be as follow
 *   - args[3] contains tokenContractAddress
 *   - args[4] contains voterWallet
 */
async function delegate() {
  const provider = new ethers.providers.InfuraProvider("goerli", process.env.INFURA_API_KEY);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY ?? "");
  const signer = wallet.connect(provider);

  const args = process.argv;
  const contractAddress = args[3];
  const voterWallet = args[4];

  console.log("[DELEGATE] : tokenizedBallot.attach(" + contractAddress + ")");
  const tokenFactory = new MyToken__factory(signer);
  let tokenContract = tokenFactory.attach(contractAddress);

  let delegateTx = await tokenContract.connect(voterWallet).delegate(voterWallet);
  const delegateReceipt = await delegateTx.wait();
  const voterTokenBalance = await tokenContract.balanceOf(voterWallet);
  console.log(`[DELEGATE] : voterTokenBalance = ${voterTokenBalance}`);
  const votePower = await tokenContract.getVotes(voterWallet);
  console.log(`[DELEGATE] : votePower = ${votePower}`);

  console.log("[DELEGATE] : Delegate Tx hash " + delegateReceipt.transactionHash);
}


/**
 * This calls Ballot.vote
 * Command line arguments must be as follow
 *   - args[3] contains ballotSmartContractAddress
 *   - args[4] contains the proposal
 * .env.PRIVATE_KEY must contains the caller wallet private key
 */
async function vote() {
  const provider = new ethers.providers.InfuraProvider("goerli", process.env.INFURA_API_KEY);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY ?? "");
  const signer = wallet.connect(provider);

  const args = process.argv;
  const contractAddress = args[3];
  const proposal = args[4];

  console.log("ballot.attach(" + contractAddress + ")");
  console.log("ballot.vote(" + proposal + ")");

  const ballotFactory = new TokenizedBallot__factory(signer);
  let ballotContract = await ballotFactory.attach(contractAddress);
  const tx = await ballotContract.vote(proposal);
  const receipt = await tx.wait();

  console.log("Vote Tx hash " + receipt.transactionHash);
}
/**
 * This calls Ballot.winnerName()
 * Command line arguments must be as follow
 *   - args[3] contains ballotSmartContractAddress
 * .env.PRIVATE_KEY must contains the caller wallet private key
 */
async function winner() {
  const provider = new ethers.providers.InfuraProvider("goerli", process.env.INFURA_API_KEY);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY ?? "");
  const signer = wallet.connect(provider);

  const args = process.argv;
  const contractAddress = args[3];
  const proposal = args[4];

  console.log("ballot.attach(" + contractAddress + ")");
  console.log("ballot.winnerName()");

  const ballotFactory = new TokenizedBallot__factory(signer);
  let ballotContract = ballotFactory.attach(contractAddress);
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
