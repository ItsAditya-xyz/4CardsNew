import React, { useEffect } from "react";
import Arweave from "arweave";
import { message, result } from "@permaweb/aoconnect";
import { createDataItemSigner as nodeCDIS } from "@permaweb/aoconnect/node";
import { useNavigate } from "react-router";
import {
  createPulseProfile,
  getUserInfoDryRun,
  parseCustomJson,
} from "../../utils/function";
import Loader from "../../Components/Loader";

import toast, { Toaster } from "react-hot-toast";
export default function Landing() {
  const navigate = useNavigate();

  const [usernameInput, setUsernameInput] = React.useState("");

  const [wallet, setWallet] = React.useState(null);
  const [address, setAddress] = React.useState(null);

  const [isLoadingUsername, setIsLoadingUsername] = React.useState(true);
  const [username, setUsername] = React.useState("");

  const PROCESS_ID = "4T8COHVsKeuOa7zgMN8Jy9LhdZxr0MRMPMhP4Ml_JZY";
  const [isCreatingRoom, setIsCreatingRoom] = React.useState(false);

  const [previewUrl, setPreviewUrl] = React.useState(
    "https://diamondapp.com/assets/img/default-profile-pic.png"
  );
  const [uploadedImage, setUploadedImage] = React.useState(
    "https://diamondapp.com/assets/img/default-profile-pic.png"
  );
  const [isUploading, setIsUploading] = React.useState(false);

  const [nameInput, setNameInput] = React.useState("");

  const [gameCode, setGameCode] = React.useState("");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
      uploadImage(file);
    }
  };

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "JWT",
      "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.e30.1Wm0Bv-ylp7zAh0VU2eqUsoca-f5tSFG0shiSlMOKqi6URm5SYTsRXvuRnc5FHpCXzpM7tWQ8erPKfiaQvZK-g"
    );
    formData.append(
      "UserPublicKeyBase58Check",
      "BC1YLgUUf3R6o9oWPTQAnLp6mNzUhSyTR26D6HZgG1Fngoa4gbCn4XJ"
    );

    try {
      setIsUploading(true);
      const response = await fetch(
        "https://node.deso.org/api/v0/upload-image",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      setUploadedImage(data.ImageURL);
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  async function initializeGameState() {
    // first check if the wallet is in local storage
    let addressTemp = "";
    if (localStorage.getItem("wallet")) {
      const wallet = JSON.parse(localStorage.getItem("wallet"));
      addressTemp = localStorage.getItem("address");
      setWallet(wallet);
      window.arweaveWallet = wallet;

      console.log("Wallet found in local storage", addressTemp);
    } else {
      const arweave = Arweave.init({
        host: "arweave.net",
        port: 443,
        protocol: "https",
      });

      const key = await arweave.wallets.generate();
      const addressGenerated = await arweave.wallets.jwkToAddress(key);

      console.log(key);
      console.log(addressGenerated);

      addressTemp = addressGenerated;

      setWallet(key);
      setAddress(addressGenerated);
      localStorage.setItem("wallet", JSON.stringify(key));
      localStorage.setItem("address", addressGenerated);
      window.arweaveWallet = key;

      console.log(
        "Wallet generated! This is new user or new browser",
        addressGenerated
      );
    }
    console.log(addressTemp);
    const userInfo = await getUserInfoDryRun(addressTemp);
    console.log(userInfo);

    if (userInfo.username) {
      setUsername(userInfo.username);
    }

    setIsLoadingUsername(false);
  }

  async function createRoom() {
    let loadingToast;
    try {
      const wallet = JSON.parse(localStorage.getItem("wallet"));
      window.arweaveWallet = wallet;
      if (!wallet) {
        toast.error("No wallet found. Please connect your wallet first");
        return;
      }
      if (!window.arweaveWallet) {
        toast.error("Arweave wallet not detected in window object");
        return;
      }

      loadingToast = toast.loading("Creating room...");

      console.log("creating room");

      console.log(window.arweaveWallet);

      const messageResult = await message({
        process: PROCESS_ID,
        tags: [{ name: "Action", value: "CreateGameRoom" }],
        signer: nodeCDIS(window.arweaveWallet),
        data: "",
      });

      if (!messageResult) {
        throw new Error("Failed to send registration message");
      }

      let { Messages, Spawns, Output, Error } = await result({
        // the arweave TXID of the message
        message: messageResult,
        // the arweave TXID of the process
        process: PROCESS_ID,
      });

      const dataTemp = Messages[0].Data;
      const jsonData = parseCustomJson(dataTemp);

      const messageText = jsonData.message;
      const gameID = jsonData.gameID;
      const password = jsonData.password;

      toast.dismiss(loadingToast);
      //setRoomLink(`${window.location.origin}/${gameID}?code=${password}`);

      toast.success(messageText);

      // after 1 second navigate to the game room

      navigate(`/room/${gameID}?c=${password}`);
      return;
    } catch (error) {
      console.error("Error creating room:", error);
      toast.error(error.message || "Failed to create room. Please try again");
    } finally {
      if (loadingToast) {
        toast.dismiss(loadingToast);
      }
    }
  }

  async function registerPlayer() {
    let loadingToast;
    try {
      // Input validation
      if (!usernameInput || usernameInput.trim() === "") {
        toast.error("Please enter a username");
        return;
      }

      if (!nameInput || nameInput.trim() === "") {
        toast.error("Please enter your name");
        return;
      }

      // Wallet validation
      const wallet = JSON.parse(localStorage.getItem("wallet"));

      window.arweaveWallet = wallet;

      if (!wallet) {
        toast.error("No wallet found. Please connect your wallet first");
        return;
      }

      if (!window.arweaveWallet) {
        toast.error("Arweave wallet not detected in window object");
        return;
      }

      // Set loading state if you have one

      loadingToast = toast.loading("Registering username...");

      console.log("registering player...");
      console.log(window.arweaveWallet);

      const pulseSetup = await createPulseProfile(
        usernameInput,
        nameInput,
        uploadedImage,
        window.arweaveWallet
      );
      console.log(pulseSetup);
      if (pulseSetup.status === "error") {
        toast.dismiss(loadingToast);
        toast.error(pulseSetup.error);
        return;
      }

      if (pulseSetup.error) {
        toast.dismiss(loadingToast);
        toast.error(pulseSetup.error);
        return;
      }

      //wait for 1000s

      const messageResult = await message({
        process: PROCESS_ID,
        tags: [
          { name: "username", value: usernameInput.trim() },
          { name: "Action", value: "RegisterPlayer" },
        ],
        signer: nodeCDIS(window.arweaveWallet),
        data: "",
      });

      if (!messageResult) {
        throw new Error("Failed to send registration message");
      }

      let { Messages, Spawns, Output, Error } = await result({
        // the arweave TXID of the message
        message: messageResult,
        // the arweave TXID of the process
        process: PROCESS_ID,
      });
      console.log(Messages, Spawns, Output, Error);
      const dataTemp = Messages[0].Data;

      const resultData = dataTemp;
      console.log("Result data:", resultData);
      // Handle response

      if (resultData === "Username already taken") {
        toast.dismiss(loadingToast);
        toast.error("Username already taken");
        return;
      } else if (
        resultData === "Successfully registered player" ||
        resultData === "Username updated successfully"
      ) {
        toast.dismiss(loadingToast);
        toast.success("Username registered successfully");
        setUsername(usernameInput.trim());
        localStorage.setItem("gameUsername", usernameInput.trim());

        // check if there is gameID and password in local storage
        const gameID = localStorage.getItem("gameID");
        const password = localStorage.getItem("password");

        console.log(gameID, password);
        if (gameID && password) {
          // remove gameID and password from local storage
          localStorage.removeItem("gameID");
          localStorage.removeItem("password");

          window.location.href = `/room/${gameID}?c=${password}`;
        }
      } else {
      }
    } catch (error) {
      console.error("Registration error:", error);

      toast.error(error.message || "Failed to register. Please try again");
    } finally {
      if (loadingToast) {
        toast.dismiss(loadingToast);
      }
    }
  }

  useEffect(() => {
    initializeGameState();
    // createWallet();
  }, []);
  return (
    <div>
      <>
        <div className="min-h-screen bg-gray-900 py-10 sm:py-14">
          <Toaster />
          <div className=" px-4 mx-auto">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-5xl font-bold text-white mb-6">
                4 Cards : Can you collect'em all?
              </h1>
              <p className="text-2xl text-white mb-12">
                Four Cards. One Champion.
              </p>

              {/* Registration Form */}

              {/* Image Section */}
              <div className="max-w-2xl mx-auto">
                {/* Uncomment and update image path when ready */}
              </div>
            </div>

            <div className="flex justify-center items-center">
              {isLoadingUsername && (
                <div className="flex items-center justify-center py-24">
                  <Loader />
                </div>
              )}
              {!isLoadingUsername && !username && (
                <div className="max-w-2xl mx-auto bg-gray-800/90 backdrop-blur-sm rounded-xl p-8 shadow-2xl">
                  <div className="text-center mb-8">
                    <p className="text-gray-400 text-center mb-2">
                      Create your profile to get started!
                    </p>
                  </div>

                  <div className="max-w-2xl mx-auto bg-gray-800/90 backdrop-blur-sm rounded-xl p-8 shadow-2xl">
                    <div className="flex flex-col items-center gap-6">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                          {previewUrl ? (
                            <img
                              src={previewUrl}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img
                              src="/default-avatar.png"
                              alt="Default Profile"
                              className="w-8 h-8"
                            />
                          )}
                        </div>
                        <label className="absolute bottom-0 right-0 p-1 bg-gray-700 rounded-full cursor-pointer hover:bg-gray-600">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <img
                            src="https://www.svgrepo.com/show/904/photo-camera.svg"
                            alt="Upload"
                            className="w-5 h-5 "
                          />
                        </label>
                      </div>

                      <div className="w-full space-y-4">
                        <input
                          type="text"
                          placeholder="Username"
                          className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400"
                          value={usernameInput}
                          onChange={(e) => {
                            setUsernameInput(e.target.value);
                          }}
                        />

                        <input
                          type="text"
                          placeholder="Full Name"
                          className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400"
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                        />

                        <button
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                          onClick={() => {
                            registerPlayer();
                          }}
                        >
                          Submit
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* <div className="flex justify-center">
                  <ConnectButton
                    onClick={() => {}}
                    accent="#1f1f1f"
                    profileModal={true}
                    showBalance={false}
                    showProfilePicture={true}
                  />
                </div> */}
                </div>
              )}

              {!isLoadingUsername && username && (
                <div>
                  <div className="max-w-2xl w-full bg-gray-800 rounded-xl p-8 shadow-2xl">
                    {/* Header */}
                    <h2 className="text-4xl font-bold text-white text-center mb-4">
                      Ready to Play?
                    </h2>
                    <p className="text-gray-400 text-center mb-12"></p>

                    <p className="text-gray-500 text-sm text-center mb-2">
                      Start a new game room and invite your friends to join
                    </p>
                    <div className="flex flex-col items-center justify-center space-y-8 w-full max-w-md mx-auto p-6">
                      {/* Create Room Section */}
                      <div className="w-full">
                        <button
                          className="relative w-full bg-green-500 hover:bg-green-600 text-white 
                     font-semibold py-4 px-8 rounded-xl transition-all 
                     duration-200 hover:translate-y-[-2px] active:translate-y-[0px]
                     shadow-lg hover:shadow-xl hover:shadow-green-500/20
                     disabled:opacity-50 disabled:cursor-not-allowed
                     focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                          onClick={createRoom}
                          disabled={isCreatingRoom}
                        >
                          {isCreatingRoom ? (
                            <span className="flex items-center justify-center gap-2">
                              
                              <span>Creating Room...</span>
                            </span>
                          ) : (
                            "Create New Room"
                          )}
                        </button>
                      </div>

                      {/* Divider */}
                      <div className="flex items-center w-full">
                        <div className="flex-1 h-px bg-gray-600"></div>
                        <span className="px-4 text-sm text-gray-400">or</span>
                        <div className="flex-1 h-px bg-gray-600"></div>
                      </div>

                      {/* Join Room Section */}
                      <div className="w-full space-y-3">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Enter Room Code"
                            className="w-full px-4 py-3 rounded-xl bg-gray-700 border-2 border-gray-600 
                       text-white placeholder-gray-400 transition-all duration-200
                       focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                            value={gameCode}
                            onChange={(e) =>
                              setGameCode(e.target.value)
                            }
                            maxLength={20}
                          />
                        </div>
                        <button
                          className="w-full bg-gray-700 hover:bg-gray-600 text-white 
                     font-semibold py-4 px-8 rounded-xl transition-all 
                     duration-200 hover:translate-y-[-2px] active:translate-y-[0px]
                     shadow-lg hover:shadow-xl
                     disabled:opacity-50 disabled:cursor-not-allowed
                     focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                          onClick={() => navigate(`/room/${gameCode}`)}
                          disabled={!gameCode}
                        >
                          Join Room
                        </button>
                      </div>
                    </div>

                    {/* Footer Info */}
                    <div className="mt-12 text-center">
                      <p className="text-gray-400 text-sm">
                        Need help?{" "}
                        <span className="text-blue-400 hover:text-blue-300 cursor-pointer">
                          View tutorial
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Bottom Text */}
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    </div>
  );
}
