import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

const USERS_FILE = path.join(__dirname, '../data/users.json');
const HOUSEHOLDS_FILE = path.join(__dirname, '../data/households.json');
const SUBSCRIPTIONS_FILE = path.join(__dirname, '../data/subscriptions.json');

const authRequired = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.replace('Bearer ', '');
  req.userToken = token;
  next();
};

const businessPlanRequired = async (req, res, next) => {
  try {
    const subscriptionsData = await fs.readFile(SUBSCRIPTIONS_FILE, 'utf8');
    const subscriptions = JSON.parse(subscriptionsData);
    
    const userSubscription = subscriptions.find(sub => sub.user_id === req.userToken);
    if (!userSubscription || userSubscription.type !== 'business') {
      return res.status(403).json({ error: 'Business plan required' });
    }
    
    req.userSubscription = userSubscription;
    next();
  } catch (error) {
    console.error('Error checking subscription:', error);
    return res.status(500).json({ error: 'Failed to verify subscription' });
  }
};

router.get('/users', authRequired, businessPlanRequired, async (req, res) => {
  try {
    const { search, status } = req.query;
    
    const [usersData, subscriptionsData, householdsData] = await Promise.all([
      fs.readFile(USERS_FILE, 'utf8'),
      fs.readFile(SUBSCRIPTIONS_FILE, 'utf8'),
      fs.readFile(HOUSEHOLDS_FILE, 'utf8')
    ]);
    
    const users = JSON.parse(usersData);
    const subscriptions = JSON.parse(subscriptionsData);
    const households = JSON.parse(householdsData);
    
    let filteredUsers = users.map(user => {
      const subscription = subscriptions.find(sub => sub.user_id === user.id);
      const userHouseholds = households.filter(h => h.user_id === user.id);
      
      return {
        id: user.id,
        email: user.email,
        name: user.name || user.email.split('@')[0],
        created_at: user.created_at || new Date().toISOString(),
        last_login_at: user.last_login_at,
        subscription: subscription ? {
          type: subscription.type,
          status: subscription.status
        } : null,
        households_count: userHouseholds.length
      };
    });
    
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        user.email.toLowerCase().includes(searchTerm) ||
        user.name.toLowerCase().includes(searchTerm)
      );
    }
    
    if (status && status !== 'all') {
      filteredUsers = filteredUsers.filter(user => 
        user.subscription && user.subscription.status === status
      );
    }
    
    const totalUsers = filteredUsers.length;
    const activeUsers = filteredUsers.filter(user => 
      user.subscription && user.subscription.status === 'active'
    ).length;
    const businessUsers = filteredUsers.filter(user => 
      user.subscription && user.subscription.type === 'business'
    ).length;
    const totalHouseholds = filteredUsers.reduce((sum, user) => sum + user.households_count, 0);
    
    res.json({
      data: filteredUsers,
      total: totalUsers,
      active: activeUsers,
      business: businessUsers,
      total_households: totalHouseholds
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.put('/users/:userId/subscription', authRequired, businessPlanRequired, async (req, res) => {
  try {
    const { userId } = req.params;
    const { type } = req.body;
    
    if (!['personal', 'family', 'business'].includes(type)) {
      return res.status(400).json({ error: 'Invalid subscription type' });
    }
    
    const subscriptionsData = await fs.readFile(SUBSCRIPTIONS_FILE, 'utf8');
    let subscriptions = JSON.parse(subscriptionsData);
    
    const subscriptionIndex = subscriptions.findIndex(sub => sub.user_id === userId);
    
    if (subscriptionIndex === -1) {
      const newSubscription = {
        id: `sub_${Date.now()}`,
        user_id: userId,
        type: type,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      subscriptions.push(newSubscription);
    } else {
      subscriptions[subscriptionIndex] = {
        ...subscriptions[subscriptionIndex],
        type: type,
        updated_at: new Date().toISOString()
      };
    }
    
    await fs.writeFile(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2));
    
    res.json({ 
      message: 'Subscription updated successfully',
      subscription: subscriptions[subscriptionIndex] || subscriptions[subscriptions.length - 1]
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

router.get('/users/:userId', authRequired, businessPlanRequired, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [usersData, subscriptionsData, householdsData] = await Promise.all([
      fs.readFile(USERS_FILE, 'utf8'),
      fs.readFile(SUBSCRIPTIONS_FILE, 'utf8'),
      fs.readFile(HOUSEHOLDS_FILE, 'utf8')
    ]);
    
    const users = JSON.parse(usersData);
    const subscriptions = JSON.parse(subscriptionsData);
    const households = JSON.parse(householdsData);
    
    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const subscription = subscriptions.find(sub => sub.user_id === userId);
    const userHouseholds = households.filter(h => h.user_id === userId);
    
    const userDetails = {
      id: user.id,
      email: user.email,
      name: user.name || user.email.split('@')[0],
      created_at: user.created_at || new Date().toISOString(),
      last_login_at: user.last_login_at,
      subscription: subscription || null,
      households: userHouseholds
    };
    
    res.json(userDetails);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

export default router;