// Real, full Privacy Policy / Terms & Conditions text — shared by every place
// in the app that links to them (originally only the login screen's footer,
// in App.tsx; extracted here so AdminSystem.tsx/AdminProfile.tsx can show the
// exact same real content instead of their own dead "Privacy Policy"/"Terms &
// Conditions" buttons — importing straight from App.tsx would create a
// circular import, since App.tsx itself imports those two screens).
import React from "react";

const PP_QS = "'Quicksand',sans-serif";
const PP_IN = "'Inter',sans-serif";
function PPHeading({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 13, fontWeight: 800, color: "#9772F6", fontFamily: PP_QS, margin: "20px 0 8px" }}>{children}</p>;
}
function PPSub({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 12, fontWeight: 800, color: "#1F2937", fontFamily: PP_QS, margin: "14px 0 6px" }}>{children}</p>;
}
function PPP({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 12, color: "#6B7280", fontFamily: PP_IN, lineHeight: 1.7, margin: "0 0 8px" }}>{children}</p>;
}
function PPUl({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: "0 0 8px", paddingLeft: 18, fontSize: 12, color: "#6B7280", fontFamily: PP_IN, lineHeight: 1.7 }}>
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  );
}

export function PrivacyPolicyContent() {
  return (
    <>
      <p style={{ fontSize: 12, color: "#9CA3AF", fontFamily: PP_IN, margin: "0 0 2px" }}>Effective Date: August 1, 2026</p>
      <p style={{ fontSize: 12, color: "#9CA3AF", fontFamily: PP_IN, margin: "0 0 14px" }}>Last Updated: September 5, 2026</p>

      <PPP>Welcome to DormiTrack!</PPP>
      <PPP>DormiTrack is designed to support the management and monitoring of students residing in boarding houses near Bohol Island State University (BISU) – Calape Campus. The system provides functions for students, parents/guardians, landlords, and the Housing Director to manage and access information related to boarding house accommodation, student records, room occupancy, payment records, reports, and boarding house-based location verification.</PPP>
      <PPP>DormiTrack respects the privacy of its users and is committed to protecting personal information. This Privacy Policy explains what information is collected, why it is collected, how it is used, who may access it, how it is protected, and what rights users have regarding their personal information.</PPP>
      <PPP>DormiTrack is intended to follow the principles and requirements of Republic Act No. 10173, or the Data Privacy Act of 2012, its Implementing Rules and Regulations, and applicable policies of the National Privacy Commission.</PPP>

      <PPHeading>Information We Collect</PPHeading>
      <PPP>DormiTrack collects information that is necessary for account creation, boarding house management, student monitoring, and other legitimate system functions.</PPP>

      <PPSub>Student Information</PPSub>
      <PPP>The system may collect:</PPP>
      <PPUl items={["Student ID number","First name","Last name","Gender","Contact number","Email address","Username and account information","Parent/guardian information","Boarding house information","Room assignment","Payment records","Reports or concerns submitted through the system","Location information when a location-based feature is used"]} />

      <PPSub>Parent/Guardian Information</PPSub>
      <PPP>The system may collect:</PPP>
      <PPUl items={["First name","Last name","Contact number","Email address","Address","Username and account information","Information necessary to establish the parent/guardian's connection with the student"]} />

      <PPSub>Landlord Information</PPSub>
      <PPP>The system may collect:</PPP>
      <PPUl items={["First name","Last name","Contact number","Email address","Address","Username and account information","Boarding house information","Boarding house location","Room information","Billing information","Reports submitted through the system"]} />

      <PPSub>Housing Director / Administrator Information</PPSub>
      <PPP>The system may collect:</PPP>
      <PPUl items={["First name","Last name","Email address","Contact number","Username and account information","Assigned system role"]} />

      <PPHeading>Boarding House Information</PPHeading>
      <PPP>DormiTrack may store information about registered boarding houses, including:</PPP>
      <PPUl items={["Boarding house name","Boarding house address","Landlord information","Room information","Room capacity","Occupancy status","Registered boarding house location","Geofence information, where applicable"]} />

      <PPHeading>Location Information</PPHeading>
      <PPP>DormiTrack may use a student's device location for boarding house presence verification.</PPP>
      <PPP>Location information may be used to determine whether the student's device is within the designated area of the registered boarding house.</PPP>
      <PPP>The system may compare:</PPP>
      <PPUl items={["The student's current location;","The registered location of the boarding house; and","The designated geofence or permitted area."]} />
      <PPP>The purpose is to support location-based student presence verification.</PPP>
      <PPP>DormiTrack is not intended to continuously track a student's movements outside the boarding house-related monitoring function.</PPP>
      <PPP>Location information should only be requested when it is necessary for an applicable system feature.</PPP>
      <PPP>Users may manage location permissions through their device settings. However, disabling location access may prevent location-dependent features from functioning.</PPP>

      <PPHeading>How We Use Personal Information</PPHeading>
      <PPP>Personal information may be used for:</PPP>
      <PPUl items={["Creating and managing user accounts","Verifying user information","Managing student records","Connecting students with their authorized parents or guardians","Managing boarding house information","Managing rooms and occupancy","Supporting boarding house selection and confirmation","Monitoring boarding house occupancy","Recording and displaying payment information","Processing reports and concerns","Supporting boarding house-based location verification","Providing authorized users with relevant information","Generating administrative reports","Maintaining system functionality","Maintaining system security","Investigating suspected unauthorized access or misuse","Complying with applicable laws and institutional requirements"]} />
      <PPP>DormiTrack will not intentionally use personal information for unrelated purposes without an appropriate lawful basis or proper notice.</PPP>

      <PPHeading>Lawful Basis for Processing</PPHeading>
      <PPP>DormiTrack will process personal information only when there is an appropriate lawful basis under applicable privacy laws.</PPP>
      <PPP>Depending on the specific processing activity, the lawful basis may include:</PPP>
      <PPUl items={["User consent","Performance of a service or agreement requested by the user","Compliance with a legal obligation","Protection of vital interests, where applicable","Performance of a public function, where applicable","Legitimate interests, where permitted by law"]} />
      <PPP>Where consent is required, users should be properly informed about the processing before providing consent.</PPP>

      <PPHeading>Student and Parent/Guardian Connection</PPHeading>
      <PPP>DormiTrack may connect a student's account with an authorized parent or guardian.</PPP>
      <PPP>This connection may be established using:</PPP>
      <PPUl items={["Student ID","Parent/guardian account information","Other verification information required by the system"]} />
      <PPP>A parent or guardian should only be able to access information related to the student they are authorized to monitor.</PPP>
      <PPP>Personal information belonging to unrelated students should not be made unnecessarily accessible.</PPP>

      <PPHeading>Role-Based Access to Information</PPHeading>
      <PPP>DormiTrack uses role-based access to limit information according to the user's authorized responsibilities.</PPP>

      <PPSub>Students</PPSub>
      <PPP>Students may access:</PPP>
      <PPUl items={["Their own profile","Their parent/guardian information","Their boarding house information","Their room information","Relevant boarding house occupant information","Their payment records","Their submitted reports","Their applicable location/presence status"]} />

      <PPSub>Parents/Guardians</PPSub>
      <PPP>Authorized parents/guardians may access information related to their linked student, including:</PPP>
      <PPUl items={["Student information","Boarding house information","Room information","Relevant occupancy information","Payment records","Applicable location/presence status"]} />

      <PPSub>Landlords</PPSub>
      <PPP>Landlords may access information necessary to manage their registered boarding house, including:</PPP>
      <PPUl items={["Boarding house information","Room information","Occupancy information","Relevant student information","Payment records associated with their boarding house","Reports concerning their boarding house","Boarding house location information"]} />

      <PPSub>Housing Director / Administrator</PPSub>
      <PPP>Authorized Housing Director or administrator accounts may access information necessary for institutional housing management, including:</PPP>
      <PPUl items={["Student records","Parent/guardian records","Landlord records","Boarding house records","Room and occupancy information","Payment-related records","Reports","Applicable location-related monitoring information","Administrative reports"]} />
      <PPP>Access should be limited to information necessary for the user's authorized role.</PPP>

      <PPHeading>Payment Information</PPHeading>
      <PPP>DormiTrack may record and display boarding house payment information such as:</PPP>
      <PPUl items={["Monthly rent","Electricity charges","Water charges","Internet fees","Amount due","Payment date","Payment status"]} />
      <PPP>DormiTrack does not process online payments unless such functionality is specifically implemented.</PPP>
      <PPP>If the system only records payment information, it does not collect or process credit card, debit card, online banking, or other payment credentials.</PPP>

      <PPHeading>Reports and Submitted Information</PPHeading>
      <PPP>Users may submit reports, concerns, or complaints through DormiTrack.</PPP>
      <PPP>Reports may contain:</PPP>
      <PPUl items={["Report reason","Report details","Report date","Student information","Boarding house information","Landlord information","Report status"]} />
      <PPP>Reports should only be used for legitimate housing-management, administrative, safety, or system-related purposes.</PPP>
      <PPP>Users should avoid submitting unnecessary sensitive or private information in report descriptions.</PPP>

      <PPHeading>Disclosure and Sharing of Personal Information</PPHeading>
      <PPP>DormiTrack will not intentionally disclose personal information indiscriminately.</PPP>
      <PPP>Information may be accessed or disclosed when:</PPP>
      <PPUl items={["The user has provided appropriate consent;","It is necessary for a legitimate system purpose;","It is required or authorized by law;","It is necessary to comply with a lawful order or request; or","It is otherwise permitted under applicable privacy laws."]} />
      <PPP>Personal information should not be sold or disclosed to unrelated parties for unrelated purposes.</PPP>

      <PPHeading>Third-Party Services</PPHeading>
      <PPP>DormiTrack may use third-party services necessary to provide specific system functions.</PPP>

      <PPSub>Google Maps / Location Services</PPSub>
      <PPP>Google Maps or related location services may be used to:</PPP>
      <PPUl items={["Display boarding house locations","Allow landlords to place a boarding house marker on the map","Display registered boarding house markers","Support location-based verification"]} />

      <PPSub>Database and Authentication Services</PPSub>
      <PPP>DormiTrack may use a cloud database or authentication provider to securely manage system information and user accounts.</PPP>
      <PPP>The final implementation should identify the actual third-party services being used.</PPP>

      <PPHeading>Data Security</PPHeading>
      <PPP>DormiTrack is committed to implementing reasonable and appropriate safeguards to protect personal information against:</PPP>
      <PPUl items={["Unauthorized access","Unauthorized disclosure","Accidental loss","Alteration","Destruction","Misuse","Other unlawful processing"]} />
      <PPP>Security measures may include, where implemented:</PPP>
      <PPUl items={["User authentication","Role-based access control","Access restrictions","Secure database configuration","Secure authentication","Secure communication","Database access controls","Monitoring of system access"]} />
      <PPP>DormiTrack will not claim to implement security measures that are not actually available in the system.</PPP>

      <PPHeading>Account Credentials</PPHeading>
      <PPP>Users are responsible for keeping their account credentials secure.</PPP>
      <PPP>Users should:</PPP>
      <PPUl items={["Keep passwords confidential","Avoid sharing account credentials","Use a secure password","Log out when using a shared device","Report suspected unauthorized account access"]} />
      <PPP>Passwords should be handled through a secure authentication mechanism and should not be stored as plain-text passwords.</PPP>

      <PPHeading>Data Accuracy</PPHeading>
      <PPP>Users are responsible for providing accurate and updated information.</PPP>
      <PPP>Users may request the correction or updating of inaccurate, incomplete, or outdated information through the appropriate system process.</PPP>

      <PPHeading>Data Retention</PPHeading>
      <PPP>DormiTrack will retain personal information only for as long as necessary for its intended purpose and applicable institutional or legal requirements.</PPP>
      <PPP>When information is no longer necessary, it may be:</PPP>
      <PPUl items={["Deleted","Destroyed","Anonymized","Securely disposed of"]} />
      <PPP>The actual retention period should follow the applicable BISU records-retention and data privacy requirements.</PPP>

      <PPHeading>Rights of Data Subjects</PPHeading>
      <PPP>Subject to applicable conditions and limitations, users may have the following rights regarding their personal information:</PPP>

      <PPSub>Right to Be Informed</PPSub>
      <PPP>Users have the right to know how their personal information is collected, used, stored, and processed.</PPP>
      <PPSub>Right to Access</PPSub>
      <PPP>Users may request access to their personal information, subject to applicable limitations.</PPP>
      <PPSub>Right to Rectification</PPSub>
      <PPP>Users may request correction of inaccurate or incomplete information.</PPP>
      <PPSub>Right to Object</PPSub>
      <PPP>Users may object to certain processing activities when permitted by law.</PPP>
      <PPSub>Right to Erasure or Blocking</PPSub>
      <PPP>Users may request deletion, removal, or blocking of personal information when legally applicable.</PPP>
      <PPSub>Right to Data Portability</PPSub>
      <PPP>Where applicable, users may request their personal information in an appropriate electronic format.</PPP>
      <PPSub>Right to File a Complaint</PPSub>
      <PPP>Users may raise privacy concerns and may file a complaint with the appropriate privacy authority when applicable.</PPP>
      <PPSub>Right to Damages</PPSub>
      <PPP>A data subject may have the right to seek compensation where legally applicable and where damage has resulted from unlawful processing or violation of privacy rights.</PPP>

      <PPHeading>Withdrawal of Consent</PPHeading>
      <PPP>Where processing is based on consent, users may withdraw their consent through the appropriate procedure.</PPP>
      <PPP>Withdrawal of consent does not necessarily affect processing that was lawfully conducted before the withdrawal.</PPP>
      <PPP>Withdrawing permission for certain functions may also affect system functionality. For example, disabling location permission may prevent location-based presence verification from working.</PPP>

      <PPHeading>Privacy and Location Permissions</PPHeading>
      <PPP>DormiTrack may request location permission when a location-dependent feature is used.</PPP>
      <PPP>Users should be informed about:</PPP>
      <PPUl items={["Why location access is required","What location information is used","How the location information supports the system","Who may access the resulting information","What happens when location permission is denied"]} />
      <PPP>DormiTrack's location feature is intended for boarding house-related presence verification, not unrestricted monitoring of student movements.</PPP>

      <PPHeading>Data Breach and Security Incidents</PPHeading>
      <PPP>In the event of a suspected or confirmed personal data breach, the responsible administrators should take appropriate measures to:</PPP>
      <PPUl items={["Contain the incident","Investigate the incident","Protect affected information","Address the cause of the incident","Notify affected parties when legally required"]} />
      <PPP>Users should report suspected privacy or security incidents to the designated system or privacy administrator.</PPP>

      <PPHeading>Privacy of Minors</PPHeading>
      <PPP>Where DormiTrack processes information relating to minors, appropriate safeguards should be applied.</PPP>
      <PPP>Where required, appropriate parental or legal guardian authorization should be obtained.</PPP>
      <PPP>The system should only collect information necessary for legitimate boarding house management and monitoring purposes.</PPP>

      <PPHeading>Changes to This Privacy Policy</PPHeading>
      <PPP>DormiTrack may update this Privacy Policy when:</PPP>
      <PPUl items={["System features change","Data processing practices change","Applicable laws or regulations change","New third-party services are introduced","Privacy and security practices are updated"]} />
      <PPP>The Last Updated date should be changed whenever this Privacy Policy is revised.</PPP>

      <PPHeading>Contact Us</PPHeading>
      <PPP>For questions, concerns, requests, or complaints regarding personal information, users may contact:</PPP>
      <PPP>DormiTrack / Bohol Island State University – Calape Campus</PPP>
      <PPUl items={["Office/Unit: [Insert Responsible Office]","Data Privacy Officer / Privacy Contact: [Insert Name or Position]","Email: [Insert Official Email]","Contact Number: [Insert Contact Number]","Address: [Insert Official Address]"]} />

      <PPHeading>User Acknowledgment</PPHeading>
      <PPP>By creating an account and using DormiTrack, the user acknowledges that they have been informed about the collection and processing of their personal information for the purposes described in this Privacy Policy.</PPP>
    </>
  );
}

export function TermsConditionsContent() {
  return (
    <>
      <p style={{ fontSize: 12, color: "#9CA3AF", fontFamily: PP_IN, margin: "0 0 2px" }}>Effective Date: August 1, 2026</p>
      <p style={{ fontSize: 12, color: "#9CA3AF", fontFamily: PP_IN, margin: "0 0 14px" }}>Last Updated: September 5, 2026</p>

      <PPHeading>Acceptance of Terms</PPHeading>
      <PPP>Welcome to DormiTrack: Boarding House Student Monitoring and Tracking System.</PPP>
      <PPP>These Terms and Conditions govern the use of DormiTrack by students, parents/guardians, landlords, and authorized Housing Director/administrator users.</PPP>
      <PPP>By creating an account or using DormiTrack, you acknowledge that you have read, understood, and agreed to comply with these Terms and Conditions.</PPP>
      <PPP>If you do not agree with these terms, you should not use the system.</PPP>

      <PPHeading>Purpose of DormiTrack</PPHeading>
      <PPP>DormiTrack is designed to support:</PPP>
      <PPUl items={["Student boarding house management","Student information management","Boarding house registration","Room and occupancy management","Boarding house selection","Parent/guardian monitoring","Payment record monitoring","Student presence verification","Boarding house location viewing","Report and concern submission","Housing administration"]} />
      <PPP>DormiTrack is intended to serve as a monitoring and management system and does not replace the responsibilities of students, parents/guardians, landlords, or authorized institutional personnel.</PPP>

      <PPHeading>User Accounts</PPHeading>
      <PPP>Users must:</PPP>
      <PPUl items={["Register using accurate information","Use their own account","Keep account credentials confidential","Provide updated information when necessary","Use the account only for its intended purpose","Immediately report suspected unauthorized account access"]} />
      <PPP>Users are responsible for activities performed through their accounts unless unauthorized access occurred without their fault.</PPP>

      <PPHeading>Student Responsibilities</PPHeading>
      <PPP>Students using DormiTrack agree to:</PPP>
      <PPUl items={["Provide accurate student information","Use their assigned account properly","Select the boarding house where they intend to stay","Provide accurate information during boarding house selection","Wait for landlord confirmation when required","Use location verification honestly","Provide accurate payment-related information when applicable","Submit truthful reports and concerns","Respect the privacy of other students","Follow applicable boarding house rules","Follow applicable BISU policies"]} />
      <PPP>Students must not intentionally provide false information or manipulate system records.</PPP>

      <PPHeading>Parent/Guardian Responsibilities</PPHeading>
      <PPP>Parents or guardians using DormiTrack agree to:</PPP>
      <PPUl items={["Provide accurate personal information","Use only their authorized account","Access information only for their linked student","Keep their account credentials confidential","Respect the privacy of other students","Use student information only for legitimate purposes","Report inaccurate information or unauthorized access"]} />
      <PPP>Parents or guardians must not attempt to access accounts or information belonging to other users.</PPP>

      <PPHeading>Landlord Responsibilities</PPHeading>
      <PPP>Landlords using DormiTrack agree to:</PPP>
      <PPUl items={["Provide accurate personal information","Provide accurate boarding house information","Register the correct boarding house location","Maintain accurate room information","Maintain accurate occupancy information","Review student boarding house requests","Confirm or reject student requests appropriately","Maintain accurate billing or payment records","Submit truthful reports","Protect student information accessible through their account","Use student information only for legitimate boarding house management"]} />
      <PPP>Landlords must not intentionally provide false occupancy, payment, student, or boarding house information.</PPP>

      <PPHeading>Housing Director / Administrator Responsibilities</PPHeading>
      <PPP>Authorized Housing Director or administrator users agree to:</PPP>
      <PPUl items={["Use administrative access only for legitimate institutional purposes","Protect confidential information","Maintain appropriate access controls","Access information only when necessary","Avoid unauthorized disclosure of user information","Review reports appropriately","Maintain accurate administrative records","Follow applicable BISU policies and data privacy requirements"]} />
      <PPP>Administrative privileges must not be used for personal purposes or unauthorized monitoring.</PPP>

      <PPHeading>Boarding House Selection and Confirmation</PPHeading>
      <PPP>Students may select an available boarding house through DormiTrack.</PPP>
      <PPP>The process may include:</PPP>
      <PPUl items={["Viewing registered boarding houses","Viewing boarding house information","Selecting a preferred boarding house","Submitting a boarding house request","Waiting for landlord confirmation","Receiving an approval or rejection","Proceeding with the selected boarding house after confirmation"]} />
      <PPP>Submitting a request does not automatically guarantee acceptance.</PPP>
      <PPP>The landlord or authorized personnel may approve or reject a student's request based on the applicable boarding house requirements.</PPP>

      <PPHeading>Boarding House and Room Information</PPHeading>
      <PPP>Landlords are responsible for providing accurate information about their registered boarding houses and rooms.</PPP>
      <PPP>This may include:</PPP>
      <PPUl items={["Boarding house name","Address","Location","Room number","Room capacity","Occupancy","Room status","Other information required by the system"]} />
      <PPP>Users should not intentionally alter or misrepresent boarding house or room information.</PPP>

      <PPHeading>Payment Records</PPHeading>
      <PPP>DormiTrack may provide functions for recording and monitoring boarding house payment information.</PPP>
      <PPP>Payment information may include:</PPP>
      <PPUl items={["Rent","Electricity","Water","Internet","Amount","Payment date","Payment status"]} />
      <PPP>Unless an online payment feature is specifically implemented, DormiTrack does not serve as an online payment processor.</PPP>
      <PPP>Users should verify payment-related information with the appropriate landlord or authorized personnel when necessary.</PPP>

      <PPHeading>Location and Presence Verification</PPHeading>
      <PPP>DormiTrack may use device location to support boarding house-based presence verification.</PPP>
      <PPP>Users agree to:</PPP>
      <PPUl items={["Grant location permission when required for the applicable feature","Use the location feature honestly","Not intentionally manipulate location information","Not attempt to bypass or falsify presence verification","Use the feature only for its intended purpose"]} />
      <PPP>DormiTrack's location functionality is intended to verify presence within a designated boarding house area and is not intended to provide unrestricted tracking of student movements.</PPP>

      <PPHeading>Reports and Complaints</PPHeading>
      <PPP>Users may submit reports or concerns through DormiTrack.</PPP>
      <PPP>Reports should:</PPP>
      <PPUl items={["Be truthful","Be relevant to the purpose of the system","Provide sufficient information when possible","Avoid unnecessary personal or sensitive information","Not be used to harass, threaten, or falsely accuse another person"]} />
      <PPP>Users who intentionally submit false or malicious reports may be subject to appropriate action under applicable institutional or system rules.</PPP>

      <PPHeading>Prohibited Activities</PPHeading>
      <PPP>Users must not:</PPP>
      <PPUl items={["Access another person's account","Use another person's identity","Share account credentials","Attempt to bypass authentication","Attempt to access restricted system functions","Modify records without authorization","Falsify information","Manipulate location verification","Falsify payment records","Submit malicious or intentionally false reports","Attempt to obtain unauthorized personal information","Disclose confidential information without authorization","Interfere with system operation","Introduce malicious software or harmful code","Use DormiTrack for unlawful activities","Use the system to harass, threaten, or harm another person"]} />

      <PPHeading>Accuracy of Information</PPHeading>
      <PPP>Users are responsible for the accuracy of the information they provide.</PPP>
      <PPP>Users should promptly update information when it becomes inaccurate or outdated.</PPP>
      <PPP>DormiTrack administrators may correct, update, or request verification of information when necessary for proper system operation.</PPP>

      <PPHeading>System Availability</PPHeading>
      <PPP>DormiTrack is intended to provide reliable access to its available functions. However, temporary interruptions may occur due to:</PPP>
      <PPUl items={["System maintenance","Technical issues","Internet connectivity problems","Server or database issues","Device problems","Third-party service interruptions","Other circumstances beyond the system administrator's reasonable control"]} />
      <PPP>DormiTrack does not guarantee uninterrupted or error-free operation at all times.</PPP>

      <PPHeading>Third-Party Services</PPHeading>
      <PPP>Certain DormiTrack functions may depend on third-party services, such as:</PPP>
      <PPUl items={["Mapping services","Location services","Cloud database services","Authentication services","Hosting services"]} />
      <PPP>The availability and operation of these services may be subject to their respective terms, policies, and technical limitations.</PPP>

      <PPHeading>User Content and Submitted Information</PPHeading>
      <PPP>Information submitted by users through DormiTrack should be:</PPP>
      <PPUl items={["Accurate","Relevant","Lawful","Appropriate for the intended system function"]} />
      <PPP>Users are responsible for the content they submit through reports, forms, or other system functions.</PPP>
      <PPP>Users must not submit content that:</PPP>
      <PPUl items={["Contains malicious code","Intentionally contains false information","Threatens another person","Harasses another user","Violates applicable laws","Unnecessarily exposes another person's private information"]} />

      <PPHeading>Intellectual Property</PPHeading>
      <PPP>The DormiTrack system, including its design, interface, branding, software components, documentation, and other original materials, may be protected by applicable intellectual property laws and institutional policies.</PPP>
      <PPP>Users may use the system only for its intended purpose.</PPP>
      <PPP>Users must not copy, modify, reproduce, distribute, reverse engineer, or commercially exploit protected system components without proper authorization, where such restrictions apply.</PPP>

      <PPHeading>Account Suspension or Termination</PPHeading>
      <PPP>Access to DormiTrack may be suspended, restricted, or terminated when:</PPP>
      <PPUl items={["A user violates these Terms and Conditions","An account is used improperly","Unauthorized access is detected","False information is intentionally provided","The system is used for unlawful activities","Suspension is necessary to protect system security","Suspension is required by applicable institutional rules or law"]} />
      <PPP>Where appropriate, users may be informed of the reason for the restriction.</PPP>

      <PPHeading>Privacy</PPHeading>
      <PPP>Use of DormiTrack is also subject to the DormiTrack Privacy Policy.</PPP>
      <PPP>The Privacy Policy explains how personal information is collected, used, stored, accessed, and protected.</PPP>
      <PPP>Users are encouraged to review the Privacy Policy before using the system.</PPP>

      <PPHeading>Limitation of Responsibility</PPHeading>
      <PPP>DormiTrack is intended to assist with boarding house monitoring and management.</PPP>
      <PPP>The system does not guarantee:</PPP>
      <PPUl items={["That a student will always be physically present at a boarding house;","That all location information will always be accurate;","That all users will provide truthful information;","That all payment records are independently verified;","That boarding house conditions are always safe;","That the system will always be available;","That technical errors will never occur."]} />
      <PPP>DormiTrack does not replace the responsibilities of students, parents/guardians, landlords, or authorized institutional personnel.</PPP>

      <PPHeading>Technical and Location Limitations</PPHeading>
      <PPP>Location-based functions may be affected by:</PPP>
      <PPUl items={["GPS accuracy","Device settings","Indoor environments","Weak signal","Internet connectivity","Device battery","Location permission settings","Mapping or location service availability"]} />
      <PPP>Therefore, a location-based status should be treated as a system-generated indication based on available location information, rather than an absolute guarantee of a student's physical presence.</PPP>

      <PPHeading>User Responsibility for Account Security</PPHeading>
      <PPP>Users are responsible for protecting their own accounts.</PPP>
      <PPP>If a user believes that their account has been compromised, they should:</PPP>
      <PPUl items={["Change their password when possible","Log out of unauthorized devices","Contact the system administrator","Report the incident immediately"]} />
      <PPP>Users should not intentionally share their credentials with other individuals.</PPP>

      <PPHeading>Changes to the Terms and Conditions</PPHeading>
      <PPP>DormiTrack may update these Terms and Conditions when:</PPP>
      <PPUl items={["New features are introduced","Existing features are modified","System policies change","Applicable laws or institutional policies change","Security requirements change"]} />
      <PPP>The Last Updated date will indicate when the Terms and Conditions were most recently revised.</PPP>
      <PPP>Continued use of DormiTrack after applicable changes may constitute acceptance of the updated terms, subject to applicable law and institutional requirements.</PPP>

      <PPHeading>Governing Policies and Applicable Rules</PPHeading>
      <PPP>The use of DormiTrack is subject to applicable:</PPP>
      <PPUl items={["Philippine laws and regulations","Data privacy requirements","BISU policies and regulations","Boarding house rules","Institutional housing policies","Other applicable administrative requirements"]} />
      <PPP>Where these Terms and Conditions conflict with mandatory law or institutional policy, the applicable law or authorized institutional policy will prevail to the extent required.</PPP>

      <PPHeading>Contact Information</PPHeading>
      <PPP>For questions or concerns regarding these Terms and Conditions, users may contact:</PPP>
      <PPP>DormiTrack / Bohol Island State University – Calape Campus</PPP>
      <PPUl items={["Office/Unit: [Insert Responsible Office]","Contact Person: [Insert Name or Position]","Email: [Insert Official Email]","Contact Number: [Insert Contact Number]","Address: [Insert Official Address]"]} />

      <PPHeading>User Agreement</PPHeading>
      <PPP>By creating an account or using DormiTrack, the user confirms that they:</PPP>
      <PPUl items={["Have read these Terms and Conditions;","Understand the rules governing the use of DormiTrack;","Agree to comply with the applicable requirements;","Will use the system responsibly; and","Understand that misuse of the system may result in restriction, suspension, or termination of access."]} />
    </>
  );
}
