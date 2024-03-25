import React, { useState, useEffect } from "react";
import Header from "./Header";
import Note from "./Note";
import Modal from "./Modal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera } from "@fortawesome/free-solid-svg-icons";
import { createNote, getAllNotes, deleteNote } from "../utils/airtable";


function App() {
  const [notes, setNotes] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [resetModal, setResetModal] = useState(false); 
  const [locationName, setLocationName] = useState("");
  const [cloudinaryUrl, setCloudinaryUrl] = useState("");

  const updateCloudinaryUrl = (url) => {
    setCloudinaryUrl(url);
  };

  useEffect(() => {
    async function fetchNotes() {
      try {
        const notesData = await getAllNotes();
        const updatedNotes = notesData.map(item => ({
          ...item,
          fields: {
            ...item.fields,
            labels: item.fields.labels.split(','), 
          },
        }));
        setNotes(updatedNotes);
      } catch (error) {
        console.error("Error fetching notes:", error);
      }
    }
    fetchNotes();
  }, []);

  async function addNote(newNote, cloudinaryUrl) {
    try {
      const createdRecord = await createNote({ ...newNote, cloudUrl: cloudinaryUrl });
      createdRecord.fields.labels = createdRecord.fields.labels.split(',');
      setNotes((prevNotes) => [...prevNotes, { ...createdRecord, cloudUrl: cloudinaryUrl }])
    } catch (error) {
      console.error("Error creating note:", error);
    }
  }

  function deleteNote(id) {
    setNotes((prevNotes) => prevNotes.filter((noteItem, index) => index !== id));
  }

  function toggleModal() {
    setModalVisible(!modalVisible);
    if (!modalVisible) {
      resetCamera();
    }
  }

  function resetCamera() {
    setResetModal(true);
  }

  return (
    <div className="mainContainer">
      <Header />
      <div className="camButtonContainer">
        <button className="camera" onClick={toggleModal}>
          <FontAwesomeIcon className="cameraBtn" icon={faCamera} />
        </button>
      </div>
      <Modal
        visible={modalVisible}
        onAdd={addNote}
        onClose={toggleModal}
        onReset={resetCamera}
        reset={resetModal}
        setLocationName={setLocationName}
        onModalClose={toggleModal}
        onCapture={(url) => setCloudinaryUrl(url)}
      />
      {notes.map((noteItem, index) => (
        <Note
          key={index}
          id={index}
          title={noteItem.fields.title}
          labels={noteItem.fields.labels}
          content={noteItem.fields.content}
          image={noteItem.fields.image}
          cloudUrl={noteItem.fields.cloudUrl}
          location={noteItem.fields.location}
          onDelete={deleteNote}
        />
      ))}
    </div>
  );
}

export default App;