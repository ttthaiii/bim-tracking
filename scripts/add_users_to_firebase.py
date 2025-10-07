
import firebase_admin
from firebase_admin import credentials, firestore, auth
import os

# Path to your service account key file
# Make sure this file is in the same directory as this script, or provide the full path
SERVICE_ACCOUNT_KEY_PATH = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')

# Initialize Firebase Admin SDK
try:
    cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("Firebase Admin SDK initialized successfully.")
except Exception as e:
    print(f"Error initializing Firebase Admin SDK: {e}")
    print("Please ensure 'serviceAccountKey.json' is in the 'scripts' directory and is valid.")
    exit()

users_to_add_raw = [
    ("100024", "Issara", "Ponjarone", "BimCoordinate"),
    ("100097", "Rangsan", "Manosan", "BimManager"),
    ("100105", "Watcharapong", "Wongta", "BimCoordinate"),
    ("100128", "Thanaphat", "Namwong", "BimLeader"),
    ("100136", "Ekasith", "Anburi", "BimLeader"),
    ("100454", "Siwaporn", "Pankhui", "BimCoordinate"),
    ("100646", "Sithichocke", "Nguanchoo", "BimLeader"),
    ("100769", "Surasak", "Singthongla", "BimCoordinate"),
    ("100884", "Jutatip", "Srirat", "BimCoordinate"),
    ("101020", "Pattanan", "Junlamunee", "BimCoordinate"),
    ("101477", "Worawut", "Nawongsa", "BimModeler"),
    ("101486", "Onnicha", "Kamsee", "BimModeler"),
    ("101508", "Bussaya", "Thapanya", "BimModeler"),
    ("101760", "Narongsak", "Buttumpan", "BimModeler"),
    ("101783", "Pattarawichaya", "Chusripetch", "BimModeler"),
    ("101794", "Pasakorn", "Phopumnak", "BimModeler"),
    ("101795", "Sutida", "Srijampa", "BimModeler"),
    ("101782", "nattagun", "talabnak", "BimModeler"),
    ("101780", "Thitikorn", "Bumrungkate", "BimModeler"),
]

def generate_user_data(employeeId, firstNameEn, lastNameEn, role):
    fullNameEn = f"{firstNameEn} {lastNameEn}"
    fullNameTh = f"{firstNameEn} {lastNameEn}" # Assuming Thai name is same as English name if not provided
    
    # Generate username: first name in lowercase + '.' + first letter of last name in lowercase
    username = f"{firstNameEn.lower()}.{lastNameEn.lower()[0]}"
    
    # Password is the employeeId
    password = employeeId

    return {
        "employeeId": employeeId,
        "fullNameTh": fullNameTh,
        "fullNameEn": fullNameEn,
        "user": username,
        "password": password, # Storing password in Firestore for simplicity, but for production, avoid storing plaintext passwords.
        "role": role # Add the role here
    }

def add_user_to_firestore_and_auth(user_data):
    employee_id = user_data["employeeId"]
    username_email = f"{user_data['user']}@yourproject.com" # Use a dummy domain for username to act as email for Auth
    password = user_data["password"]
    role = user_data["role"]

    print(f"Processing user: {user_data['fullNameEn']} (ID: {employee_id}) with role: {role}")

    # 1. Add/Update user in Firestore
    try:
        doc_ref = db.collection('Users').document(employee_id)
        doc_ref.set(user_data)
        print(f"Firestore: User '{user_data['fullNameEn']}' (ID: {employee_id}) added/updated.")
    except Exception as e:
        print(f"Firestore Error for {user_data['fullNameEn']}: {e}")

    # 2. Create user in Firebase Authentication and set custom claims
    try:
        user_record = auth.get_user_by_email(username_email)
        print(f"Auth: User '{username_email}' already exists. Updating custom claims.")
        auth.set_custom_user_claims(user_record.uid, {'role': role})
        print(f"Auth: Custom claim 'role' set to '{role}' for user {username_email}.")
    except auth.UserNotFoundError:
        try:
            user_record = auth.create_user(
                email=username_email,
                password=password,
                display_name=user_data["fullNameEn"],
                uid=employee_id # Use employeeId as UID for easy linking
            )
            print(f"Auth: User '{username_email}' created successfully with UID: {user_record.uid}")
            auth.set_custom_user_claims(user_record.uid, {'role': role})
            print(f"Auth: Custom claim 'role' set to '{role}' for new user {username_email}.")
        except Exception as e:
            print(f"Auth Error creating user {username_email}: {e}")
    except Exception as e:
        print(f"Auth Error checking user {username_email}: {e}")


if __name__ == "__main__":
    print("Starting user data population...")
    for emp_id, first_name, last_name, role in users_to_add_raw:
        user_data = generate_user_data(emp_id, first_name, last_name, role)
        add_user_to_firestore_and_auth(user_data)
    print("User data population complete.")
    print("\nIMPORTANT: For Firebase Authentication, the 'user' field is used as an email with a dummy domain '@yourproject.com'.")
    print("You will need to ensure your frontend login logic uses this format, or adjust the script to use a real domain if you have one.")
    print("Also, for production applications, do NOT store plaintext passwords in Firestore as done in this example. Use Firebase Authentication for secure password management.")
    print("To access custom claims (like role) in your frontend, you'll need to re-authenticate the user or force a token refresh after claims are set.")
    print("For example, after login, you might call 'firebase.auth().currentUser.getIdToken(true)' to get the latest token with claims.")
