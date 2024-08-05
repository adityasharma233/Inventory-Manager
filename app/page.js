'use client'

import { useState, useEffect } from 'react'
import { Box, Stack, Typography, Button, Modal, TextField, AppBar, Toolbar, IconButton, InputAdornment, Select, MenuItem, Chip, Drawer } from '@mui/material'
import { Add, Remove, Search, Sort, FilterList, BarChart, Brightness4, Brightness7, FileDownload } from '@mui/icons-material'
import { firestore, auth } from '@/firebase'
import { collection, doc, onSnapshot, query, setDoc, deleteDoc, getDoc, where, orderBy } from 'firebase/firestore'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import dynamic from 'next/dynamic'
import { CSVLink } from 'react-csv'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { ssr: false })

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
}

const categories = ['Electronics', 'Clothing', 'Food', 'Books', 'Other']

export default function Home() {
  const [inventory, setInventory] = useState([])
  const [open, setOpen] = useState(false)
  const [itemName, setItemName] = useState('')
  const [itemCategory, setItemCategory] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [filterCategory, setFilterCategory] = useState('')
  const [user, setUser] = useState(null)
  const [darkMode, setDarkMode] = useState(false)
  const [chartData, setChartData] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  useEffect(() => {
    ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);
  }, []);

  useEffect(() => {
    let q = query(collection(firestore, 'inventory'))

    if (filterCategory) {
      q = query(q, where('category', '==', filterCategory))
    }

    q = query(q, orderBy(sortBy))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const inventoryList = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      console.log("Updated inventory:", inventoryList);
      setInventory(inventoryList)

      // Update chart data
      const labels = inventoryList.map((item) => item.name)
      const data = inventoryList.map((item) => item.quantity)
      setChartData({
        labels,
        datasets: [
          {
            label: 'Quantity',
            data,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1,
          },
        ],
      })
    }, (error) => {
      console.error("Error in snapshot listener:", error);
    })

    return () => unsubscribe()
  }, [searchTerm, sortBy, filterCategory])

  const addItem = async (item, category) => {
    try {
      const docRef = doc(collection(firestore, 'inventory'))
      const newItem = { name: item, quantity: 1, category }
      await setDoc(docRef, newItem)
      console.log("Document successfully added with ID:", docRef.id);
      setInventory(prevInventory => [...prevInventory, { id: docRef.id, ...newItem }])
    } catch (error) {
      console.error("Error adding document: ", error);
    }
  }

  const removeItem = async (itemId) => {
    try {
      const docRef = doc(firestore, 'inventory', itemId)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        const { quantity } = docSnap.data()
        if (quantity === 1) {
          await deleteDoc(docRef)
          setInventory(prevInventory => prevInventory.filter(item => item.id !== itemId))
        } else {
          await setDoc(docRef, { quantity: quantity - 1 }, { merge: true })
          setInventory(prevInventory => prevInventory.map(item => 
            item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item
          ))
        }
        console.log("Document successfully updated/removed");
      }
    } catch (error) {
      console.error("Error removing document: ", error);
    }
  }

  const handleOpen = () => setOpen(true)
  const handleClose = () => setOpen(false)

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider()
    try {
      const result = await signInWithPopup(auth, provider)
      setUser(result.user)
    } catch (error) {
      console.error('Error signing in:', error)
    }
  }

  const handleLogout = async () => {
    try {
      await auth.signOut()
      setUser(null)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  console.log("Current inventory:", inventory);

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        bgcolor: darkMode ? 'grey.900' : 'background.default',
        color: darkMode ? 'common.white' : 'common.black',
      }}
    >
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Inventory Management
          </Typography>
          <IconButton color="inherit" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
          {user ? (
            <>
              <Typography>{user.displayName}</Typography>
              <Button color="inherit" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <Button color="inherit" onClick={handleLogin}>
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          p: 3,
          gap: 2,
        }}
      >
        <TextField
          label="Search"
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />

        <Stack direction="row" spacing={2}>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            startAdornment={
              <InputAdornment position="start">
                <Sort />
              </InputAdornment>
            }
          >
            <MenuItem value="name">Name</MenuItem>
            <MenuItem value="quantity">Quantity</MenuItem>
            <MenuItem value="category">Category</MenuItem>
          </Select>

          <Select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            startAdornment={
              <InputAdornment position="start">
                <FilterList />
              </InputAdornment>
            }
          >
            <MenuItem value="">All Categories</MenuItem>
            {categories.map((category) => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </Select>

          <Button
            variant="contained"
            startIcon={<BarChart />}
            onClick={() => setDrawerOpen(true)}
          >
            View Charts
          </Button>

          <CSVLink data={inventory} filename="inventory.csv">
            <Button variant="contained" startIcon={<FileDownload />}>
              Export CSV
            </Button>
          </CSVLink>
        </Stack>

        <Button variant="contained" onClick={handleOpen} startIcon={<Add />}>
          Add New Item
        </Button>

        <Stack width="100%" spacing={2}>
          {inventory.map(({ id, name, quantity, category }) => (
            <Box
              key={id}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                bgcolor: darkMode ? 'grey.800' : 'grey.100',
                p: 2,
                borderRadius: 1,
              }}
            >
              <Typography variant="h6">
                {name.charAt(0).toUpperCase() + name.slice(1)}
              </Typography>
              <Chip label={category} color="primary" />
              <Typography>Quantity: {quantity}</Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  onClick={() => addItem(name, category)}
                  startIcon={<Add />}
                >
                  Add
                </Button>
                <Button
                  variant="contained"
                  onClick={() => removeItem(id)}
                  startIcon={<Remove />}
                >
                  Remove
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setSelectedItem({ id, name, quantity, category })
                    setItemName(name)
                    setItemCategory(category)
                    handleOpen()
                  }}
                >
                  Edit
                </Button>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Box>

      <Modal open={open} onClose={handleClose}>
        <Box sx={style}>
          <Typography variant="h6" component="h2">
            {selectedItem ? 'Edit Item' : 'Add Item'}
          </Typography>
          <TextField
            label="Item Name"
            variant="outlined"
            fullWidth
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
          />
          <Select
            value={itemCategory}
            onChange={(e) => setItemCategory(e.target.value)}
            fullWidth
          >
            {categories.map((category) => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </Select>
          <Button
            variant="contained"
            onClick={() => {
              if (selectedItem) {
                const updatedItem = { ...selectedItem, name: itemName, category: itemCategory }
                setDoc(doc(firestore, 'inventory', selectedItem.id), updatedItem, { merge: true })
                  .then(() => {
                    setInventory(prevInventory => prevInventory.map(item => 
                      item.id === selectedItem.id ? updatedItem : item
                    ))
                  })
              } else {
                addItem(itemName, itemCategory)
              }
              setItemName('')
              setItemCategory('')
              setSelectedItem(null)
              handleClose()
            }}
          >
            {selectedItem ? 'Update' : 'Add'}
          </Button>
        </Box>
      </Modal>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Box sx={{ width: 400, p: 2 }}>
          <Typography variant="h6">Inventory Chart</Typography>
          {chartData && chartData.datasets && chartData.datasets.length > 0 && <Line data={chartData} />}
        </Box>
      </Drawer>
    </Box>
  )
}

