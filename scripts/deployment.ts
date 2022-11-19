import { MyToken, MyToken__factory } from "../typechain-types";
import { ethers } from "hardhat";
import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import

dotenv.config()
const TEST_MINT_VALUE = ethers.utils.parseEther("10");

async function main() {
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
    let votePower =  await contract.getVotes(voter.address);
    console.log(`After mint votePower = ${votePower}`);
    let delegateTx = await contract.connect(voter).delegate(voter.address);
    await delegateTx.wait();
    votePower =  await contract.getVotes(voter.address);
    console.log(`After delegating votePower = ${votePower}`);
    const transferTx = await contract.connect(voter).transfer(other.address, TEST_MINT_VALUE.div(2));
    await transferTx.wait();
    votePower =  await contract.getVotes(voter.address);
    console.log(`After transfer votePower = ${votePower}`);
    votePower =  await contract.getVotes(other.address);
    console.log(`After transfer other votePower = ${votePower}`);
    delegateTx = await contract.connect(other).delegate(other.address);
    await delegateTx.wait();
    votePower =  await contract.getVotes(other.address);
    console.log(`After transfer and delegate other votePower = ${votePower}`);
}


/**
 * let call main()
 */
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
