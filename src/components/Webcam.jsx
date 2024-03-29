import React, { useState, useEffect, useRef } from "react";
import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";
import { uploadImageToCloudinary } from "../utils/cloudinaryUtils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCameraRotate } from "@fortawesome/free-solid-svg-icons";
import Webcam from "react-webcam"; 

function Webcamcomponent(props) {
  const webcamRef = useRef(null);
  const [model, setModel] = useState(null);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [imageLabels, setImageLabels] = useState([]);
  const [capturedImage, setCapturedImage] = useState(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [, setCloudinaryUrl] = useState("");
  const [isFrontCamera, setIsFrontCamera] = useState(true);

  useEffect(() => {
    getVideo();
    loadModel();
  }, []);

  const getVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: isFrontCamera ? "user" : "environment" },
      });
      let video = webcamRef.current.video;
      video.srcObject = stream;
    } catch (err) {
      console.error("Error accessing webcam:", err);
    }
  };

  const toggleCamera = (event) => {
    event.preventDefault();
    setIsFrontCamera((prev) => !prev);
    getVideo();
  };

  const loadModel = async () => {
    try {
      const loadedModel = await mobilenet.load();
      setModel(loadedModel);
      setModelLoaded(true);
    } catch (error) {
      console.error("Error loading model:", error);
    }
  };

  const takePhoto = async (event) => {
    event.preventDefault();
    if (!modelLoaded || !webcamRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
    await analyzeImageWithTF(imageSrc);
    setHasPhoto(true);

    try {
      const uploadResponse = await uploadImageToCloudinary(imageSrc);
      const uploadedUrl = uploadResponse.secure_url;
      setCloudinaryUrl(uploadedUrl);

      if (uploadedUrl) {
        props.onCapture(imageSrc, uploadedUrl);
        props.onCloudinaryUrlUpdate(uploadedUrl);
      } else {
        console.error("Uploaded URL is undefined");
      }
    } catch (error) {
      console.error("Error uploading image to Cloudinary:", error);
    }
  };

  const analyzeImageWithTF = async (base64ImageData) => {
    if (!model) return;
    try {
      const img = new Image();
      img.onload = async () => {
        const tensor = tf.browser
          .fromPixels(img)
          .resizeNearestNeighbor([224, 224])
          .toFloat()
          .expandDims();
        const predictions = await model.classify(tensor);
        const uniqueLabels = {};
        predictions.forEach((label) => {
          const classNames = label.className
            .split(",")
            .map((item) => item.trim());
          classNames.forEach((className) => {
            uniqueLabels[className] = true;
          });
        });
        const trimmedLabels = Object.keys(uniqueLabels).map((className) => ({
          classNames: [className],
        }));
        setImageLabels(trimmedLabels);
      };
      img.src = base64ImageData;
    } catch (error) {
      console.error("Error analyzing image with TensorFlow:", error);
    }
  };

  const handleLabelClick = (className) => {
    props.onLabelSelect(className);
    setImageLabels((prevLabels) =>
      prevLabels.filter((label) => !label.classNames.includes(className))
    );
  };

  const deletePhoto = () => {
    setHasPhoto(false);
    setCapturedImage(null);
    setImageLabels([]);
  };

  const resetCamera = () => {
    setHasPhoto(false);
    setCapturedImage(null);
    setImageLabels([]);
  };

  useEffect(() => {
    if (props.visible === false) {
      resetCamera();
    }
  }, [props.visible]);

  useEffect(() => {
    if (modelLoaded) {
      const photoButton = document.getElementById("photoButton");
      if (photoButton) {
        photoButton.addEventListener("click", takePhoto);
      }
    }

    return () => {
      const photoButton = document.getElementById("photoButton");
      if (photoButton) {
        photoButton.removeEventListener("click", takePhoto);
      }
    };
  }, [modelLoaded, takePhoto]);

  return (
    <div className="webcamContainer">
      <div className="webcam">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/png"
          videoConstraints={{ facingMode: isFrontCamera ? "user" : "environment" }}
        />
        <button id="photoButton" className="snap" onClick={takePhoto}>
          Snap
        </button>
        <button className="flipCamera" onClick={toggleCamera}>
          <FontAwesomeIcon icon={faCameraRotate} style={{ color: "#feffff" }} />
        </button>
      </div>
      <div className={"result " + (hasPhoto ? "hasPhoto" : "")}>
        {hasPhoto && (
          <>
            <img
              className="captured-photo"
              src={capturedImage}
              alt="Captured"
              style={{ width: "100%" }}
            />
            <button className="delete" onClick={deletePhoto}>
              Delete
            </button>
            <div className="labels">
              <h3>Looks like you're having:</h3>
              <ul>
                {imageLabels.map((label, labelIndex) =>
                  label.classNames.map((className, classNameIndex) => (
                    <li
                      className="list"
                      key={`${labelIndex}-${classNameIndex}`}
                      onClick={() => handleLabelClick(className)}
                    >
                      {className}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Webcamcomponent;
